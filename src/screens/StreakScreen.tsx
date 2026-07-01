import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useNavigation } from '@react-navigation/native';
import { colors, filterColor } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import { useAppState } from '../state/AppState';
import { APIService } from '../services/api';

export default function StreakScreen() {
  const nav = useNavigation<any>();
  const { streak, refreshStreak, user, token } = useAppState();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    refreshStreak();
  }, []);

  const days = streak?.streakDays ?? user?.streakDays ?? 0;
  const history = streak?.history ?? [];
  const isPro = user?.isPro ?? false;

  const lastPostAt = streak?.lastPostAt ?? user?.lastPostAt;
  const isStreakAtRisk = lastPostAt ? Date.now() - new Date(lastPostAt).getTime() > 24 * 3600 * 1000 : days === 0;

  const onSaveStreak = async () => {
    if (!token || !isPro) {
      Alert.alert('pro feature', 'streak insurance is available with flash. pro.');
      return;
    }
    setSaving(true);
    try {
      const res = await APIService.useStreakInsurance(token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('streak saved 🔥', res.message);
      refreshStreak();
    } catch (e: any) {
      Alert.alert('error', e?.body?.error === 'pro_required' ? 'pro required' : 'could not save streak.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <ScreenHeader title="streak" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {/* Big streak number */}
        <View style={styles.hero}>
          <Text style={styles.heroNumber}>{days}</Text>
          <Text style={styles.heroLabel}>day{days !== 1 ? 's' : ''} streak</Text>
          <View style={styles.flameRow}>
            {Array.from({ length: Math.min(days, 7) }).map((_, i) => (
              <Ionicons key={i} name="flame" size={18} color={colors.yellow} />
            ))}
            {days === 0 && <Ionicons name="flame-outline" size={18} color={colors.textFade} />}
          </View>
        </View>

        {/* Streak insurance */}
        {isPro && isStreakAtRisk && (
          <Pressable onPress={onSaveStreak} style={styles.insuranceCard} disabled={saving}>
            <Ionicons name="shield-checkmark" size={18} color={colors.yellow} />
            <View style={{ flex: 1 }}>
              <Text style={styles.insuranceTitle}>streak at risk</Text>
              <Text style={styles.insuranceBody}>tap to use your streak insurance save.</Text>
            </View>
            {saving ? <ActivityIndicator color={colors.yellow} /> : <Ionicons name="flash" size={16} color={colors.yellow} />}
          </Pressable>
        )}

        {/* History */}
        <Text style={styles.sectionLabel}>history</Text>
        {history.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={28} color={colors.textHint} />
            <Text style={styles.emptyText}>no flashes yet. take your first photo.</Text>
          </View>
        )}
        {history.map((h: any, i: number) => (
          <View key={h.id ?? i} style={styles.row}>
            <View style={[styles.filterDot, { backgroundColor: filterColor[h.filter] ?? '#888' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{h.filter} flash</Text>
              <Text style={styles.rowMeta}>{new Date(h.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.chemBadge}>
              <Text style={styles.chemText}>{h.chemistry ?? 0}%</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 16,
  },
  heroNumber: { color: colors.yellow, fontSize: 56, fontWeight: '800', letterSpacing: -2 },
  heroLabel: { color: colors.textDim, fontSize: 13 },
  flameRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  empty: { alignItems: 'center', gap: 8, paddingTop: 40 },
  emptyText: { color: colors.textDim, fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { color: colors.white, fontSize: 13, fontWeight: '600' },
  rowMeta: { color: colors.textFade, fontSize: 10 },
  chemBadge: {
    backgroundColor: 'rgba(48,209,88,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  chemText: { color: colors.green, fontSize: 10, fontWeight: '700' },
  insuranceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.25)',
    borderRadius: 12,
    padding: 12,
  },
  insuranceTitle: { color: colors.yellow, fontSize: 13, fontWeight: '700' },
  insuranceBody: { color: colors.textDim, fontSize: 11 },
});
