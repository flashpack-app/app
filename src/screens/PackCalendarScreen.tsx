import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScreenHeader from '../components/ScreenHeader';
import ProGate from '../components/ProGate';
import { useAppState } from '../state/AppState';
import Mosaic from '../components/Mosaic';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function groupByMonth(packs: any[]) {
  const groups: Record<string, any[]> = {};
  for (const p of packs) {
    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function PackCalendarScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const { packs, user } = useAppState();
  const isPro = user?.isPro ?? false;

  const groups = useMemo(() => groupByMonth(packs), [packs]);

  return (
    <View style={styles.wrap}>
      <ScreenHeader
        title="archive"
        right={
          <Pressable onPress={() => nav.navigate('PackVault')} style={styles.rightBtn}>
            <Ionicons name="cube-outline" size={20} color={colors.yellow} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 24 }}>
        {groups.length === 0 && (
          <Text style={styles.empty}>no packs yet.</Text>
        )}
        {groups.map(([key, monthPacks]) => {
          const [year, monthIdx] = key.split('-');
          const monthName = MONTHS[parseInt(monthIdx, 10) - 1];
          return (
            <View key={key}>
              <Text style={styles.monthLabel}>
                {monthName} {year} · {monthPacks.length} pack{monthPacks.length > 1 ? 's' : ''}
              </Text>
              <View style={styles.grid}>
                {monthPacks.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => isPro && nav.navigate('PackReveal', { packId: p.id })}
                    style={styles.card}
                  >
                    <Mosaic pack={p} height={120} borderRadius={8} cellGap={2} animateOnMount={false} />
                    <View style={styles.cardMeta}>
                      <Text style={styles.cardNum}>#{p.number}</Text>
                      <Text style={styles.cardChem}>{p.chemistryScore}%</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {!isPro && (
        <ProGate
          title="archive is pro"
          subtitle="upgrade to flash. pro to unlock your pack archive."
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  rightBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40, fontSize: 12 },

  monthLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cardNum: { color: colors.white, fontSize: 11, fontWeight: '600' },
  cardChem: { color: colors.yellow, fontSize: 10, fontWeight: '700' },
});
