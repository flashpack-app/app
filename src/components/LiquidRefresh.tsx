import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useAccessibility } from '../services/AccessibilityContext';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ZAP = 'M13 2L4.5 13.5H11.5L11 22L19.5 10.5H12.5L13 2Z';
const ZAP_LENGTH = 60;

export default function LiquidRefresh({ progress }: { progress: SharedValue<number> }) {
  const { reduceMotion, minimizeAnimations } = useAccessibility();
  const motionReduced = reduceMotion || minimizeAnimations;

  const animatedProps = useAnimatedProps(() => {
    if (motionReduced) {
      return { strokeDasharray: `${ZAP_LENGTH},0` };
    }
    const filled = progress.value * ZAP_LENGTH;
    return {
      strokeDasharray: `${filled},${ZAP_LENGTH - filled}`,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    const visible = progress.value > 0;
    return {
      opacity: progress.value,
      height: visible ? 48 : 0,
      paddingVertical: visible ? 10 : 0,
    };
  });

  return (
    <Animated.View style={[styles.wrap, containerStyle]} pointerEvents="none">
      <Svg width={36} height={36} viewBox="0 0 24 24">
        <Path
          d={ZAP}
          stroke="#FFD300"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.12}
        />
        <AnimatedPath
          d={ZAP}
          stroke="#FFD300"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          animatedProps={animatedProps}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});