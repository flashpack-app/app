import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { UserSettings, loadSettings, saveSettings } from '../services/settingsStore';
import { useAccessibility, updateAccessibilitySettings } from '../services/AccessibilityContext';
import ScaledText from '../components/ScaledText';

const ToggleRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}> = ({ icon, label, value, onToggle }) => (
  <View style={styles.row}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={17} color={colors.white} />
    </View>
    <ScaledText style={styles.rowLabel}>{label}</ScaledText>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#333', true: colors.yellow + '66' }}
      thumbColor={value ? colors.yellow : '#888'}
      ios_backgroundColor="#333"
    />
  </View>
);

const ChoiceRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}> = ({ icon, label, value, options, onChange }) => (
  <View style={styles.row}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={17} color={colors.white} />
    </View>
    <ScaledText style={styles.rowLabel}>{label}</ScaledText>
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

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <ScaledText style={styles.sectionLabel}>{title}</ScaledText>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function AccessibilitySettingsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { refresh } = useAccessibility();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const patch = async (partial: Partial<UserSettings>) => {
    const next = { ...(settings ?? {}), ...partial } as UserSettings;
    setSettings(next);
    await saveSettings(partial);
    // Push the changed accessibility flags into the global context so other
    // components (AppText, animations, etc.) react immediately.
    await updateAccessibilitySettings(partial);
    await refresh();
  };

  const s = settings;
  if (!s) return <View style={styles.wrap} />;

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <ScaledText style={styles.title}>accessibility</ScaledText>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
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
  title: { color: colors.white, fontSize: 16, fontWeight: '700' },
  scroll: { padding: 12, gap: 14, paddingBottom: 40 },
  section: { gap: 6 },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '500' },
  choicePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  choiceText: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
  hint: { color: colors.textFade, fontSize: 11, lineHeight: 18, textAlign: 'center' },
});
