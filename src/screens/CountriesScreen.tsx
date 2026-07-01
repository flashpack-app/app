import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import { useAppState } from '../state/AppState';

interface CountryEntry {
  code: string;
  flag: string;
  members: { username: string; userId: string }[];
  packCount: number;
}

export default function CountriesScreen() {
  const nav = useNavigation<any>();
  const { packs, user } = useAppState();

  const countries = useMemo(() => {
    const map = new Map<string, CountryEntry>();
    for (const p of packs) {
      for (const m of p.members) {
        if (!m.country || m.country === user?.country) continue;
        if (!map.has(m.country)) {
          map.set(m.country, { code: m.country, flag: m.flag, members: [], packCount: 0 });
        }
        const entry = map.get(m.country)!;
        if (!entry.members.find((x) => x.userId === m.userId)) {
          entry.members.push({ username: m.username, userId: m.userId });
        }
        entry.packCount += 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.packCount - a.packCount);
  }, [packs, user]);

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="countries" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {countries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="globe-outline" size={40} color={colors.textFade} />
            <Text style={styles.emptyTitle}>no countries yet</Text>
            <Text style={styles.emptySub}>packed-with countries will appear here after you join packs.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={styles.count}>{countries.length} countr{countries.length === 1 ? 'y' : 'ies'}</Text>
            {countries.map((c) => (
              <View key={c.code} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.flag}>{c.flag}</Text>
                  <Text style={styles.name}>{c.code}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.meta}>{c.packCount} pack{c.packCount === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.memberWrap}>
                  {c.members.slice(0, 5).map((m) => (
                    <View key={m.userId} style={styles.memberPill}>
                      <Text style={styles.memberText}>@{m.username}</Text>
                    </View>
                  ))}
                  {c.members.length > 5 && (
                    <Text style={styles.moreText}>+{c.members.length - 5} more</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  scroll: { padding: 12, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  emptySub: { color: colors.textFade, fontSize: 12, textAlign: 'center' },
  count: { color: colors.textDim, fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flag: { fontSize: 18 },
  name: { color: colors.white, fontSize: 13, fontWeight: '600' },
  meta: { color: colors.textFade, fontSize: 11 },
  memberWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  memberPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  memberText: { color: colors.textSecondary, fontSize: 11 },
  moreText: { color: colors.textFade, fontSize: 11, alignSelf: 'center' },
});
