import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { UserSettings, loadSettings, saveSettings } from '../services/settingsStore';

const ToggleRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}> = ({ icon, label, value, onToggle, disabled }) => (
  <View style={[styles.row, disabled && { opacity: 0.4 }]}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={17} color={disabled ? colors.textFade : colors.white} />
    </View>
    <Text style={[styles.rowLabel, disabled && { color: colors.textFade }]}>{label}</Text>
    <Switch
      value={value}
      onValueChange={disabled ? undefined : onToggle}
      trackColor={{ false: '#333', true: colors.yellow + '66' }}
      thumbColor={value ? colors.yellow : '#888'}
      ios_backgroundColor="#333"
      disabled={disabled}
    />
  </View>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function NotificationSettingsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const patch = (partial: Partial<UserSettings>) => {
    const next = { ...(settings ?? {}), ...partial } as UserSettings;
    setSettings(next);
    saveSettings(partial);
  };

  const s = settings;
  if (!s) return <View style={styles.wrap} />;

  const pushDisabled = !s.pushNotifications;
  const inAppDisabled = !s.inAppNotifications;
  const emailDisabled = !s.emailNotifications;

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>notification settings</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="push notifications">
          <ToggleRow
            icon="phone-portrait-outline"
            label="enable push"
            value={s.pushNotifications}
            onToggle={(v) => patch({ pushNotifications: v })}
          />
          <ToggleRow
            icon="cube-outline"
            label="new packs"
            value={s.pushNewPacks}
            onToggle={(v) => patch({ pushNewPacks: v })}
            disabled={pushDisabled}
          />
          <ToggleRow
            icon="chatbubble-outline"
            label="comments"
            value={s.pushComments}
            onToggle={(v) => patch({ pushComments: v })}
            disabled={pushDisabled}
          />
          <ToggleRow
            icon="heart-outline"
            label="reactions"
            value={s.pushReactions}
            onToggle={(v) => patch({ pushReactions: v })}
            disabled={pushDisabled}
          />
          <ToggleRow
            icon="flame-outline"
            label="streak reminders"
            value={s.pushStreakReminders}
            onToggle={(v) => patch({ pushStreakReminders: v })}
            disabled={pushDisabled}
          />
        </Section>

        <Section title="in-app notifications">
          <ToggleRow
            icon="tv-outline"
            label="enable in-app"
            value={s.inAppNotifications}
            onToggle={(v) => patch({ inAppNotifications: v })}
          />
          <ToggleRow
            icon="cube-outline"
            label="new packs"
            value={s.inAppNewPacks}
            onToggle={(v) => patch({ inAppNewPacks: v })}
            disabled={inAppDisabled}
          />
          <ToggleRow
            icon="chatbubble-outline"
            label="comments"
            value={s.inAppComments}
            onToggle={(v) => patch({ inAppComments: v })}
            disabled={inAppDisabled}
          />
        </Section>

        <Section title="email">
          <ToggleRow
            icon="mail-outline"
            label="enable email"
            value={s.emailNotifications}
            onToggle={(v) => patch({ emailNotifications: v })}
          />
          <ToggleRow
            icon="newspaper-outline"
            label="weekly digest"
            value={s.emailWeeklyDigest}
            onToggle={(v) => patch({ emailWeeklyDigest: v })}
            disabled={emailDisabled}
          />
        </Section>

        <Section title="alerts">
          <ToggleRow
            icon="camera-outline"
            label="screenshot warnings"
            value={s.screenshotWarnings}
            onToggle={(v) => patch({ screenshotWarnings: v })}
          />
          <ToggleRow
            icon="volume-high-outline"
            label="sound effects"
            value={s.soundEffects}
            onToggle={(v) => patch({ soundEffects: v })}
          />
          <ToggleRow
            icon="pulse-outline"
            label="vibration"
            value={s.vibration}
            onToggle={(v) => patch({ vibration: v })}
          />
        </Section>
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
});
