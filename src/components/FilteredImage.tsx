import React, { useCallback, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  Canvas,
  Image,
  ImageShader,
  Shader,
  Fill,
  useImage,
  Skia,
  FilterMode,
  MipmapMode,
  rect,
} from '@shopify/react-native-skia';
import { VibeFilter } from '../types/models';
import { getFilterDef } from '../services/filters';

interface Props {
  source: string | { uri: string };
  filter: VibeFilter | string | null | undefined;
  style?: StyleProp<ViewStyle>;
  resizeMode?: 'cover' | 'contain';
  /** Show a spinner over the image until it finishes loading. */
  showLoader?: boolean;
}

const LUT_SKSL = `
uniform shader image;
uniform shader lut;
uniform float size;
uniform float intensity;

half4 main(float2 xy) {
  half4 src = image.eval(xy);
  half3 c = clamp(src.rgb, 0.0, 1.0);

  float maxIdx = size - 1.0;
  float blueIdx = c.b * maxIdx;
  float b0 = floor(blueIdx);
  float b1 = min(b0 + 1.0, maxIdx);
  float fb = blueIdx - b0;

  float rx = c.r * maxIdx + 0.5;
  float gy = c.g * maxIdx + 0.5;

  half3 s0 = lut.eval(float2(b0 * size + rx, gy)).rgb;
  half3 s1 = lut.eval(float2(b1 * size + rx, gy)).rgb;
  half3 graded = mix(s0, s1, fb);

  half3 outc = mix(c, graded, intensity);
  return half4(outc * src.a, src.a);
}`;

const lutEffect = Skia.RuntimeEffect.Make(LUT_SKSL);

const FilteredImage: React.FC<Props> = ({ source, filter, style, resizeMode = 'cover', showLoader = false }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const uri = typeof source === 'string' ? source : source?.uri;
  const image = useImage(uri);
  const def = getFilterDef(filter);
  const lutImage = useImage(def.lut);

  const onLayout = useCallback((e: any) => {
    setLayout(e.nativeEvent.layout);
  }, []);

  const { width, height } = layout;
  const fit = resizeMode === 'contain' ? 'contain' : 'cover';

  // If there's no layout yet, render a fallback ExpoImage to start fetching and measuring
  if (width === 0 || height === 0) {
    return (
      <View style={[style, styles.placeholder]} onLayout={onLayout}>
        {uri ? (
          <ExpoImage
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            contentFit={fit}
            cachePolicy="memory-disk"
            recyclingKey={uri}
            transition={200}
          />
        ) : null}
      </View>
    );
  }

  const useLut = !!def.lut && !!lutImage && !!lutEffect;

  // Bypassing Skia completely if there's no LUT filter, or if Skia assets haven't loaded yet.
  // This ensures we get instant image loading, native caching, and 100% crash/black-screen resistance.
  if (!useLut || !image) {
    return (
      <View style={style} onLayout={onLayout}>
        {uri ? (
          <>
            <ExpoImage
              source={{ uri }}
              style={StyleSheet.absoluteFillObject}
              contentFit={fit}
              cachePolicy="memory-disk"
              recyclingKey={uri}
              transition={200}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
            {showLoader && loading ? (
              <View style={[StyleSheet.absoluteFillObject, styles.loader]} pointerEvents="none">
                <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
              </View>
            ) : null}
          </>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, styles.placeholder]} />
        )}
      </View>
    );
  }

  const dst = rect(0, 0, width, height);

  return (
    <View style={style} onLayout={onLayout}>
      <Canvas style={{ width, height }} pointerEvents="none">
        <Fill>
          <Shader
            source={lutEffect!}
            uniforms={{ size: def.lutSize ?? 33, intensity: def.intensity ?? 1 }}
          >
            <ImageShader
              image={image}
              fit={fit}
              rect={dst}
              tx="clamp"
              ty="clamp"
              sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }}
            />
            <ImageShader
              image={lutImage!}
              fit="none"
              tx="clamp"
              ty="clamp"
              sampling={{ filter: FilterMode.Linear, mipmap: MipmapMode.None }}
            />
          </Shader>
        </Fill>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#111' },
  loader: { alignItems: 'center', justifyContent: 'center' },
});

export default React.memo(FilteredImage);
