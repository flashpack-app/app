import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  flag: string;
  name: string;
  onPress?: () => void;
}

const CountryChip: React.FC<Props> = ({ flag, name, onPress }) => {
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

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  flag: { fontSize: 12 },
  name: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
});

export default CountryChip;
