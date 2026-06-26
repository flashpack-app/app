import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { ALL_FILTERS, VibeFilter } from '../types/models';
import { colors } from '../theme/colors';
import { filterDefs } from '../services/filters';

interface Props {
  selected: VibeFilter;
  onSelect: (f: VibeFilter) => void;
  isPro?: boolean;
}

const FilterStrip: React.FC<Props> = ({ selected, onSelect, isPro }) => {
  const handlePress = (f: VibeFilter) => {
    onSelect(f);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>vibe filter</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {ALL_FILTERS.map((f) => {
          const active = f === selected;
          const def = filterDefs[f];
          const pro = def.isPro;
          return (
            <Pressable key={f} onPress={() => handlePress(f)} style={styles.item}>
              <View
                style={[
                  styles.thumb,
                  active && styles.thumbActive,
                  pro && !isPro && styles.thumbPro,
                ]}
              >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: def.color }]} />
                {f === 'raw' && (
                  <View style={[StyleSheet.absoluteFill, styles.rawSlash]} />
                )}
                {pro && !isPro && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>pro</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.name, active && { color: colors.yellow }]}>{def.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8 },
  label: {
    color: colors.textDim,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  row: { gap: 14, paddingHorizontal: 16 },
  item: { alignItems: 'center', gap: 4 },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: colors.yellow, borderWidth: 1.5 },
  thumbPro: { opacity: 0.5 },
  rawSlash: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)', borderStyle: 'dashed' },
  proBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.yellow,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  proBadgeText: { color: '#000', fontSize: 7, fontWeight: '800' },
  name: { fontSize: 9, color: colors.textDim },
});

export default FilterStrip;
