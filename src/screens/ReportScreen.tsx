import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ToastAndroid, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import Mosaic from '../components/Mosaic';
import PillButton from '../components/PillButton';
import ScreenHeader from '../components/ScreenHeader';
import { APIService } from '../services/api';
import { t } from '../services/i18n';

function getReasons() {
  return [
    t('report_reason_nudity'),
    t('report_reason_harassment'),
    t('report_reason_violence'),
    t('report_reason_spam'),
    t('report_reason_other'),
  ];
}

export default function ReportScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { packs, token, comments } = useAppState();
  const id = route.params?.packId;
  const commentId = route.params?.commentId;
  const pack = packs.find((p) => p.id === id) ?? packs[0];
  const comment = commentId ? comments[id]?.find((c) => c.id === commentId) : null;
  const [selected, setSelected] = useState<string | null>(null);

  const REASONS = getReasons();

  const onSubmit = async () => {
    if (!selected || !token) return;
    try {
      if (commentId) {
        await APIService.reportComment(token, commentId, selected);
      } else if (pack) {
        await APIService.reportPack(token, pack.id, selected);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === 'android') ToastAndroid.show(t('report_success_toast'), ToastAndroid.SHORT);
      else Alert.alert(t('report_success_toast'));
      nav.goBack();
    } catch (error) {
      console.error('failed to submit report:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('settings_biometric_error_title'), t('report_bug_failed'));
    }
  };

  return (
    <View style={styles.wrap}>
      <ScreenHeader title={commentId ? t('report_comment_title') : t('report_pack_title')} />

      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
        {pack && <Mosaic pack={pack} height={88} cellGap={1} showFlags={false} borderRadius={10} />}

        <Text style={styles.sectionLabel}>{t('report_section_issue')}</Text>

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
            {t('report_warning_invite')}
          </Text>
        </View>

        <PillButton variant="red" label={t('reportLabel')} onPress={onSubmit} disabled={!selected} style={{ height: 44 }}>
          <Ionicons name="flag-outline" size={14} color={colors.white} />
        </PillButton>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
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
