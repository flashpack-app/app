import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  flag: string;
  name: string;
  onPress?: () => void;
}

const CountryChip: React.FC<Props> = ({ flag, name, onPress }) => {
  const styles = useThemedStyles(makeStyles);
  const content = (
    <View style={styles.chip}>
      <Text style={styles.flag}>{flag}</Text>
      <Text style={styles.name}>{name}</Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
};

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surfaceSofter,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.surfaceMid,
      borderRadius: 20,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    flag: { fontSize: 12 },
    name: { color: colors.textSecondary, fontSize: 11 },
  });

export default CountryChip;
