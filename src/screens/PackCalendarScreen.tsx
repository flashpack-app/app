import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
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
  const nav = useNavigation<any>();
  const { packs, user } = useAppState();
  const insets = useSafeAreaInsets();
  const isPro = user?.isPro ?? false;

  const groups = useMemo(() => groupByMonth(packs), [packs]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>archive</Text>
        <Pressable onPress={() => nav.navigate('PackVault')} style={styles.backBtn}>
          <Ionicons name="cube-outline" size={20} color={colors.yellow} />
        </Pressable>
      </View>

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
        <View style={styles.blurOverlay}>
          <View style={styles.lockContent}>
            <Ionicons name="lock-closed" size={28} color={colors.yellow} />
            <Text style={styles.lockTitle}>archive is pro</Text>
            <Text style={styles.lockSub}>upgrade to flash. pro to unlock your pack archive.</Text>
            <Pressable
              onPress={() => nav.navigate('Pro')}
              style={({ pressed }) => [
                styles.upgradeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="flash" size={14} color="#000" />
              <Text style={styles.upgradeText}>upgrade to pro</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: 40, fontSize: 12 },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    top: 44,
  },
  lockContent: { alignItems: 'center', gap: 8, padding: 20 },
  lockTitle: { color: colors.white, fontSize: 14, fontWeight: '700' },
  lockSub: { color: colors.textFade, fontSize: 11, textAlign: 'center', maxWidth: 220 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 4,
  },
  upgradeText: { color: '#000', fontSize: 12, fontWeight: '700' },
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
