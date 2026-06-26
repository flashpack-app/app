import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { UserSettings, loadSettings, saveSettings } from '../services/settingsStore';
import { useAppState } from '../state/AppState';

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
    <Text style={styles.rowLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#333', true: colors.yellow + '66' }}
      thumbColor={value ? colors.yellow : '#888'}
      ios_backgroundColor="#333"
    />
  </View>
);

const NavRow: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}> = ({ icon, label, onPress }) => (
  <Pressable onPress={onPress} style={styles.row}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={17} color={colors.white} />
    </View>
    <Text style={styles.rowLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={14} color={colors.textFade} />
  </Pressable>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function PrivacySettingsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAppState();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const patch = (partial: Partial<UserSettings>) => {
    const next = { ...(settings ?? {}), ...partial } as UserSettings;
    setSettings(next);
    saveSettings(partial);
  };

  const toggleSilentMode = (v: boolean) => {
    if (v && !user?.isPro) {
      Alert.alert('pro feature', 'silent mode is available with flash. pro.');
      return;
    }
    patch({ silentMode: v });
  };

  const s = settings;
  if (!s) return <View style={styles.wrap} />;

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>privacy settings</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="profile visibility">
          <ToggleRow
            icon="eye-outline"
            label="public profile"
            value={s.profilePublic}
            onToggle={(v) => patch({ profilePublic: v })}
          />
          <ToggleRow
            icon="location-outline"
            label="show city & country"
            value={s.showLocation}
            onToggle={(v) => patch({ showLocation: v })}
          />
          <ToggleRow
            icon="flame-outline"
            label="show streak publicly"
            value={s.showStreakPublic}
            onToggle={(v) => patch({ showStreakPublic: v })}
          />
          <ToggleRow
            icon="radio-button-on-outline"
            label="show activity status"
            value={s.showActivityStatus}
            onToggle={(v) => patch({ showActivityStatus: v })}
          />
          <ToggleRow
            icon="at-outline"
            label="allow mentions"
            value={s.allowMentions}
            onToggle={(v) => patch({ allowMentions: v })}
          />
        </Section>

        <Section title="pro">
          <ToggleRow
            icon="eye-off-outline"
            label={user?.isPro ? 'silent mode' : 'silent mode (pro)'}
            value={s.silentMode}
            onToggle={toggleSilentMode}
          />
        </Section>

        <Section title="content">
          <ToggleRow
            icon="images-outline"
            label="auto-save to camera roll"
            value={s.autoSaveCameraRoll}
            onToggle={(v) => patch({ autoSaveCameraRoll: v })}
          />
          <ToggleRow
            icon="grid-outline"
            label="show pack previews"
            value={s.showPackPreviews}
            onToggle={(v) => patch({ showPackPreviews: v })}
          />
          <ToggleRow
            icon="shield-outline"
            label="block screenshots"
            value={s.blockScreenshots}
            onToggle={(v) => {
              patch({ blockScreenshots: v });
              if (v) Alert.alert('note', 'other users will still be notified if they screenshot your packs. this setting only blocks screenshots on your device where supported.');
            }}
          />
        </Section>

        <Section title="blocked users">
          <NavRow
            icon="ban-outline"
            label="manage blocked users"
            onPress={() => Alert.alert('blocked users', 'you have no blocked users.')}
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
