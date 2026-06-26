import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ToastAndroid, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';
import Mosaic from '../components/Mosaic';
import PillButton from '../components/PillButton';
import { APIService } from '../services/api';

const REASONS = [
  'nudity or sexual content',
  'harassment or threats',
  'violence or graphic content',
  'spam or fake account',
  'something else',
];

export default function ReportScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { packs, token } = useAppState();
  const id = route.params?.packId;
  const pack = packs.find((p) => p.id === id) ?? packs[0];
  const [selected, setSelected] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!selected || !token || !pack) return;
    try {
      await APIService.reportPack(token, pack.id, selected);
    } catch {}
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS === 'android') ToastAndroid.show('report submitted', ToastAndroid.SHORT);
    else Alert.alert('report submitted');
    nav.goBack();
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>report pack</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
        {pack && <Mosaic pack={pack} height={88} cellGap={1} showFlags={false} borderRadius={10} />}

        <Text style={styles.sectionLabel}>what's the issue?</Text>

        <View style={{ gap: 6 }}>
          {REASONS.map((r) => {
            const active = selected === r;
            return (
              <Pressable
                key={r}
                onPress={() => setSelected(r)}
                style={[styles.row, active && styles.rowActive]}
              >
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioInner} />}
                </View>
                <Text style={[styles.rowText, active && { color: colors.red }]}>{r}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.warning}>
          <Ionicons name="shield-outline" size={14} color={colors.textFade} />
          <Text style={styles.warningText}>
            the person who invited the reported user is also notified. repeat violations remove both accounts.
          </Text>
        </View>

        <PillButton variant="red" label="submit report" onPress={onSubmit} disabled={!selected} style={{ height: 44 }}>
          <Ionicons name="flag-outline" size={14} color={colors.white} />
        </PillButton>
      </ScrollView>
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
  back: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 16, fontWeight: '700' },
  sectionLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  rowActive: {
    backgroundColor: 'rgba(255,69,58,0.06)',
    borderColor: 'rgba(255,69,58,0.3)',
  },
  rowText: { color: colors.textSecondary, fontSize: 12 },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.red },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  warning: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
  },
  warningText: { color: colors.textFade, fontSize: 11, flex: 1, lineHeight: 16 },
});
