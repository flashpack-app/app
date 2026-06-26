import React, { useCallback, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
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
}

// GPU 3D-LUT lookup. `image` is the fitted photo, `lut` is the strip texture
// (size*size wide, size tall). We do trilinear interpolation: bilinear in R/G is
// handled by the LUT's linear sampler; the blue axis is lerped manually between
// the two neighbouring slices.
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

  // +0.5 centres the sample on the texel for linear interpolation across R/G.
  float rx = c.r * maxIdx + 0.5;
  float gy = c.g * maxIdx + 0.5;

  half3 s0 = lut.eval(float2(b0 * size + rx, gy)).rgb;
  half3 s1 = lut.eval(float2(b1 * size + rx, gy)).rgb;
  half3 graded = mix(s0, s1, fb);

  half3 outc = mix(c, graded, intensity);
  return half4(outc * src.a, src.a);
}`;

const lutEffect = Skia.RuntimeEffect.Make(LUT_SKSL);

const FilteredImage: React.FC<Props> = ({ source, filter, style, resizeMode = 'cover' }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const uri = typeof source === 'string' ? source : source.uri;
  const image = useImage(uri);
  const def = getFilterDef(filter);
  const lutImage = useImage(def.lut);

  const onLayout = useCallback((e: any) => {
    setLayout(e.nativeEvent.layout);
  }, []);

  const { width, height } = layout;
  const fit = resizeMode === 'contain' ? 'contain' : 'cover';

  if (!image || width === 0 || height === 0) {
    return <View style={[style, styles.placeholder]} onLayout={onLayout} />;
  }

  const dst = rect(0, 0, width, height);
  const useLut = !!def.lut && !!lutImage && !!lutEffect;

  return (
    <View style={style} onLayout={onLayout}>
      <Canvas style={{ width, height }} pointerEvents="none">
        {useLut ? (
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
        ) : (
          <Image image={image} x={0} y={0} width={width} height={height} fit={fit} />
        )}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#111' },
});

export default React.memo(FilteredImage);
