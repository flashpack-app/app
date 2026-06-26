import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  label: string;
  dotColor?: string;
}

const StatusPill: React.FC<Props> = ({ label, dotColor = colors.green }) => (
  <View style={styles.pill}>
    <View style={[styles.dot, { backgroundColor: dotColor }]} />
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { color: colors.white, fontSize: 11, fontWeight: '500' },
});

export default StatusPill;
