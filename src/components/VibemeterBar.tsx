import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Palette } from '../theme/colors';
import { filterColor } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { VibeFilter } from '../types/models';
import { FILTER_LABEL } from '../services/filters';
import ScaledText from './ScaledText';

interface Props {
  filter: VibeFilter;
  value: number; // 0..1
}

const VibemeterBar: React.FC<Props> = ({ filter, value }) => {
  const styles = useThemedStyles(makeStyles);
  const c = filterColor[filter];
  const pct = Math.round(value * 100);
  return (
    <View style={styles.row}>
      <ScaledText style={styles.name} numberOfLines={1}>
        {FILTER_LABEL[filter]}
      </ScaledText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: c }]} />
      </View>
      <ScaledText style={[styles.pct, { color: c }]}>{pct}%</ScaledText>
    </View>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  name: { color: colors.textSecondary, fontSize: 10, width: 56 },
  track: {
    flex: 1,
    height: 5,
    backgroundColor: colors.surfaceMid,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2.5 },
  pct: { fontSize: 10, fontWeight: '600', width: 36, textAlign: 'right' },
});

export default VibemeterBar;
