import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  label: string;
  dotColor?: string;
}

const StatusPill: React.FC<Props> = ({ label, dotColor }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: dotColor ?? colors.green }]} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: colors.surfaceSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.overlay(0.1),
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    label: { color: colors.white, fontSize: 11, fontWeight: '500' },
  });

export default StatusPill;
