import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useSettings } from '../hooks/useSettings';
import { useAccessibility } from '../services/AccessibilityContext';
import { UserSettings } from '../services/settingsStore';
import ScaledText from '../components/ScaledText';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, Section, useSettingsStyles } from '../components/settings';
import { t } from '../services/i18n';
import * as Haptics from '../services/haptics';

const ChoiceRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}> = ({ icon, label, value, options, onChange }) => {
  const colors = useColors();
  const settingsStyles = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={settingsStyles.row}>
      <View style={settingsStyles.rowIcon}>
        <Ionicons name={icon} size={17} color={colors.white} />
      </View>
      <ScaledText style={settingsStyles.rowLabel}>{label}</ScaledText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {options.map((o) => (
          <Pressable
            key={o}
            onPress={() => onChange(o)}
            style={[
              styles.choicePill,
              value === o && { backgroundColor: colors.yellow },
            ]}
          >
            <ScaledText style={[styles.choiceText, value === o ? { color: '#000', fontWeight: '700' } : {}]}>
              {t(('settings_theme_' + o) as any, { defaultValue: o })}
            </ScaledText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const LanguageModalRow: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const colors = useColors();
  const settingsStyles = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);

  const options = [
    { key: 'system', label: 'System Default', flag: '⚙️' },
    { key: 'en', label: 'English', flag: '🇬🇧' },
    { key: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { key: 'es', label: 'Español', flag: '🇪🇸' },
    { key: 'jp', label: '日本語', flag: '🇯🇵' },
    { key: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { key: 'ru', label: 'Русский', flag: '🇷🇺' },
    { key: 'fr', label: 'Français', flag: '🇫🇷' },
    { key: 'ko', label: '한국어', flag: '🇰🇷' },
    { key: 'zh', label: '简体中文', flag: '🇨🇳' },
  ];

  const selected = options.find((o) => o.key === value) ?? options[0];

  return (
    <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setModalVisible(true);
        }}
        style={[settingsStyles.row, { minHeight: 48 }]}
      >
        <View style={settingsStyles.rowIcon}>
          <Ionicons name="globe-outline" size={17} color={colors.white} />
        </View>
        <ScaledText style={settingsStyles.rowLabel}>{t('language')}</ScaledText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ScaledText style={{ color: colors.yellow, fontSize: 13, fontWeight: '600' }}>
            {selected.flag} {selected.label}
          </ScaledText>
          <Ionicons name="chevron-forward" size={14} color={colors.textFade} />
        </View>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ScaledText style={styles.modalTitle}>{t('language')}</ScaledText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ScaledText style={styles.modalClose}>{t('cancel')}</ScaledText>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {options.map((o) => (
                <TouchableOpacity
                  key={o.key}
                  style={[
                    styles.modalItem,
                    value === o.key && { backgroundColor: 'rgba(255,214,10,0.08)' },
                  ]}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onChange(o.key);
                    setModalVisible(false);
                  }}
                >
                  <ScaledText style={styles.modalItemFlag}>{o.flag}</ScaledText>
                  <ScaledText
                    style={[
                      styles.modalItemName,
                      value === o.key ? { color: colors.yellow, fontWeight: '700' } : {},
                    ]}
                  >
                    {o.label}
                  </ScaledText>
                  {value === o.key && <Ionicons name="checkmark" size={16} color={colors.yellow} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function AccessibilitySettingsScreen() {
  const { refresh } = useAccessibility();
  const { settings, patch: basePatch } = useSettings();
  const settingsStyles = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);

  const patch = async (partial: Partial<UserSettings>) => {
    if (await basePatch(partial)) await refresh();
  };

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title={t('settings_accessibility_title')} />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
        <Section title={t('settings_appearance_section')}>
          <ChoiceRow
            icon="color-palette-outline"
            label={t('settings_theme_label')}
            value={s.theme}
            options={['light', 'dark', 'system']}
            onChange={(v) => patch({ theme: v as UserSettings['theme'] })}
          />
          <LanguageModalRow
            value={s.language ?? 'system'}
            onChange={(v) => patch({ language: v as any })}
          />
        </Section>

        <Section title={t('settings_feedback_section')}>
          <ToggleRow
            icon="hand-left-outline"
            label={t('settings_haptics_label')}
            value={s.hapticsEnabled}
            onToggle={(v) => patch({ hapticsEnabled: v })}
          />
          <ToggleRow
            icon="timer-outline"
            label={t('settings_reduce_motion_label')}
            value={s.reduceMotion}
            onToggle={(v) => patch({ reduceMotion: v })}
          />
          <ToggleRow
            icon="flash-off-outline"
            label={t('settings_minimize_animations_label')}
            value={s.minimizeAnimations}
            onToggle={(v) => patch({ minimizeAnimations: v })}
          />
        </Section>

        <Section title={t('settings_display_section')}>
          <ToggleRow
            icon="contrast-outline"
            label={t('settings_high_contrast_label')}
            value={s.highContrast}
            onToggle={(v) => patch({ highContrast: v })}
          />
          <ToggleRow
            icon="text-outline"
            label={t('settings_larger_text_label')}
            value={s.largerText}
            onToggle={(v) => patch({ largerText: v })}
          />
          <ChoiceRow
            icon="expand-outline"
            label={t('settings_button_size_label')}
            value={s.buttonSize}
            options={['normal', 'large']}
            onChange={(v) => patch({ buttonSize: v as 'normal' | 'large' })}
          />
        </Section>

        <Section title={t('settings_assistive_section')}>
          <ToggleRow
            icon="ear-outline"
            label={t('settings_screen_reader_label')}
            value={s.screenReaderOptimized}
            onToggle={(v) => patch({ screenReaderOptimized: v })}
          />
        </Section>

        <View style={{ padding: 12 }}>
          <ScaledText style={styles.hint}>
            {t('settings_accessibility_hint')}
          </ScaledText>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    choicePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.surfaceMid,
    },
    choiceText: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
    hint: { color: colors.textFade, fontSize: 11, lineHeight: 18, textAlign: 'center' },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'flex-end',
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#2a2a2a',
    },
    modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600' },
    modalClose: { color: colors.yellow, fontSize: 14, fontWeight: '600' },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#2a2a2a',
    },
    modalItemFlag: { fontSize: 20, marginRight: 12 },
    modalItemName: { flex: 1, color: colors.white, fontSize: 15 },
  });
