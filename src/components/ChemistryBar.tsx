import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface Props {
  score: number; // 0-100
  label?: string;
  animate?: boolean;
}

const ChemistryBar: React.FC<Props> = ({ score, label = 'vibe match', animate = true }) => {
  const w = useSharedValue(animate ? 0 : score);

  useEffect(() => {
    if (animate) {
      w.value = withTiming(score, { duration: 900, easing: Easing.out(Easing.quad) });
    } else {
      w.value = score;
    }
  }, [score, animate]);

  const fill = useAnimatedStyle(() => {
    const pct = w.value;
    const fillColor =
      pct <= 40
        ? interpolateColor(pct, [0, 40], [colors.red, colors.yellow])
        : pct <= 70
          ? interpolateColor(pct, [40, 70], [colors.yellow, '#8BE9FD'])
          : interpolateColor(pct, [70, 100], ['#8BE9FD', colors.green]);
    return {
      width: `${pct}%`,
      backgroundColor: fillColor,
    };
  });

  const scoreStyle = useAnimatedStyle(() => ({
    color:
      w.value <= 40
        ? colors.red
        : w.value <= 70
          ? colors.yellow
          : colors.green,
  }));

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]} />
      </View>
      <Animated.Text style={[styles.scoreBase, scoreStyle]}>{score}%</Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.textDim, fontSize: 10, letterSpacing: 0.3 },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceMid,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
  scoreBase: { fontSize: 11, fontWeight: '600' },
});

export default ChemistryBar;
