import React from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useSettings } from '../hooks/useSettings';
import { useAccessibility, updateAccessibilitySettings } from '../services/AccessibilityContext';
import { UserSettings, saveSettings } from '../services/settingsStore';
import ScaledText from '../components/ScaledText';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, Section, useSettingsStyles } from '../components/settings';

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
            <ScaledText style={[styles.choiceText, ...(value === o ? [{ color: '#000', fontWeight: '700' } as any] : [])]}>
              {o}
            </ScaledText>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export default function AccessibilitySettingsScreen() {
  const { refresh } = useAccessibility();
  const { settings, patch: basePatch } = useSettings();
  const settingsStyles = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);

  const patch = async (partial: Partial<UserSettings>) => {
    basePatch(partial);
    await saveSettings(partial);
    await updateAccessibilitySettings(partial);
    await refresh();
  };

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title="accessibility" />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
        <Section title="appearance">
          <ChoiceRow
            icon="color-palette-outline"
            label="theme"
            value={s.theme}
            options={['light', 'dark', 'system']}
            onChange={(v) => patch({ theme: v as UserSettings['theme'] })}
          />
        </Section>

        <Section title="feedback">
          <ToggleRow
            icon="hand-left-outline"
            label="haptics"
            value={s.hapticsEnabled}
            onToggle={(v) => patch({ hapticsEnabled: v })}
          />
          <ToggleRow
            icon="timer-outline"
            label="reduce motion"
            value={s.reduceMotion}
            onToggle={(v) => patch({ reduceMotion: v })}
          />
          <ToggleRow
            icon="flash-off-outline"
            label="minimize animations"
            value={s.minimizeAnimations}
            onToggle={(v) => patch({ minimizeAnimations: v })}
          />
        </Section>

        <Section title="display">
          <ToggleRow
            icon="contrast-outline"
            label="high contrast"
            value={s.highContrast}
            onToggle={(v) => patch({ highContrast: v })}
          />
          <ToggleRow
            icon="text-outline"
            label="larger text"
            value={s.largerText}
            onToggle={(v) => patch({ largerText: v })}
          />
          <ChoiceRow
            icon="expand-outline"
            label="button size"
            value={s.buttonSize}
            options={['normal', 'large']}
            onChange={(v) => patch({ buttonSize: v as 'normal' | 'large' })}
          />
        </Section>

        <Section title="assistive">
          <ToggleRow
            icon="ear-outline"
            label="screen reader optimized"
            value={s.screenReaderOptimized}
            onToggle={(v) => patch({ screenReaderOptimized: v })}
          />
        </Section>

        <View style={{ padding: 12 }}>
          <ScaledText style={styles.hint}>
            accessibility settings are saved locally and take effect immediately.
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
  });
