import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pack } from '../types/models';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  visible: boolean;
  pack: Pack;
  hasDailyTopic?: boolean;
  onClose: () => void;
}

interface Factor {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  points: number;
  max: number;
}

const scoreColor = (s: number, colors: Palette) =>
  s >= 70 ? colors.green : s >= 50 ? colors.amber : colors.textDim;

// Mirrors the server's chemistry formula so we can explain the score:
// base 50 + people + country diversity + filter diversity + proximity + topic bonus.
function computeFactors(pack: Pack, hasDailyTopic: boolean): Factor[] {
  const members = pack.members.length;
  const countries = pack.countriesCount;
  const filters = new Set(pack.photos.map((p) => p.filter)).size;
  const apart = pack.apartMinutes;

  const people = Math.min(12, members * 3);
  const country = Math.min(16, countries * 6);
  const filter = Math.min(12, filters * 4);
  const proximity = apart === 0 ? 0 : Math.max(0, 10 - Math.floor(apart / 15));

  const factors: Factor[] = [
    {
      icon: 'people',
      label: 'people',
      detail: `${members} in the pack`,
      points: people,
      max: 12,
    },
    {
      icon: 'earth',
      label: 'country diversity',
      detail: `${countries} ${countries === 1 ? 'country' : 'countries'}`,
      points: country,
      max: 16,
    },
    {
      icon: 'color-palette',
      label: 'filter diversity',
      detail: `${filters} ${filters === 1 ? 'filter' : 'filters'} used`,
      points: filter,
      max: 12,
    },
    {
      icon: 'time',
      label: 'shot together',
      detail: apart === 0 ? 'same moment' : `${apart} min apart`,
      points: proximity,
      max: 10,
    },
  ];

  if (hasDailyTopic) {
    factors.push({
      icon: 'sparkles',
      label: 'daily topic',
      detail: 'matched today’s prompt',
      points: 5,
      max: 5,
    });
  }

  return factors;
}

const ChemistryBreakdown: React.FC<Props> = ({ visible, pack, hasDailyTopic = false, onClose }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const factors = useMemo(() => computeFactors(pack, hasDailyTopic), [pack, hasDailyTopic]);
  const color = scoreColor(pack.chemistryScore, colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom) }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>chemistry breakdown</Text>
              <Text style={styles.sub}>why this pack scored what it did</Text>
            </View>
            <Text style={[styles.bigScore, { color }]}>{pack.chemistryScore}%</Text>
          </View>

          <View style={styles.baseRow}>
            <Ionicons name="flash" size={14} color={colors.textDim} />
            <Text style={styles.baseLabel}>base score</Text>
            <Text style={styles.basePoints}>+50</Text>
          </View>

          {factors.map((f) => (
            <View key={f.label} style={styles.factor}>
              <View style={styles.factorIcon}>
                <Ionicons name={f.icon} size={15} color={colors.yellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.factorLabel}>{f.label}</Text>
                <Text style={styles.factorDetail}>{f.detail}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(f.points / f.max) * 100}%` }]} />
                </View>
              </View>
              <Text style={[styles.factorPoints, f.points === 0 && { color: colors.textFade }]}>
                +{f.points}
              </Text>
            </View>
          ))}

          <Text style={styles.footer}>
            higher scores come from bigger, more global packs shot close in time with varied filters.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 14,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { color: colors.white, fontSize: 16, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  bigScore: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  baseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  baseLabel: { color: colors.textDim, fontSize: 12, flex: 1, fontWeight: '600' },
  basePoints: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  factorIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,214,10,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  factorLabel: { color: colors.white, fontSize: 13, fontWeight: '700' },
  factorDetail: { color: colors.textDim, fontSize: 11, marginTop: 1 },
  barTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surfaceMid,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', backgroundColor: colors.yellow, borderRadius: 2 },
  factorPoints: { color: colors.green, fontSize: 14, fontWeight: '800' },
  footer: {
    color: colors.textFade,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
    marginTop: 14,
  },
});

export default ChemistryBreakdown;
