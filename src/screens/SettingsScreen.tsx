import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from '../services/haptics';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';
import { UserSettings, loadSettings, saveSettings } from '../services/settingsStore';
import ScaledText from '../components/ScaledText';

/* ─── ToggleRow ─── */
interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  accentColor?: string;
}
const ToggleRow: React.FC<ToggleRowProps> = ({ icon, label, value, onToggle, accentColor }) => (
  <View style={styles.row}>
    <View style={[styles.rowIcon, accentColor ? { backgroundColor: accentColor + '22' } : null]}>
      <Ionicons name={icon} size={17} color={accentColor ?? colors.white} />
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

/* ─── NavRow ─── */
interface NavRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  accentColor?: string;
}
const NavRow: React.FC<NavRowProps> = ({ icon, label, value, onPress, destructive, accentColor }) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.6 }]}
  >
    <View style={[styles.rowIcon, accentColor ? { backgroundColor: accentColor + '22' } : null]}>
      <Ionicons name={icon} size={17} color={accentColor ?? (destructive ? colors.red : colors.white)} />
    </View>
    <ScaledText style={[styles.rowLabel, ...(destructive ? [{ color: colors.red }] : [])]}>{label}</ScaledText>
    {value !== undefined && <ScaledText style={styles.rowValue}>{value}</ScaledText>}
    {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textFade} />}
  </Pressable>
);

/* ─── Section ─── */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <ScaledText style={styles.sectionLabel}>{title}</ScaledText>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function SettingsScreen() {
  const nav = useNavigation<any>();
  const { user, signOut, updateAvatar } = useAppState();
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

  if (!user) return <View style={styles.wrap} />;

  const onPickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('permission needed', 'allow access to photos to set your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        const FileSystem = await import('expo-file-system');
        const dir = (FileSystem as any).documentDirectory ?? '';
        const dest = `${dir}avatar-${Date.now()}.jpg`;
        await (FileSystem as any).copyAsync({ from: result.assets[0].uri, to: dest });
        updateAvatar(dest);
      } catch {
        updateAvatar(result.assets[0].uri);
      }
    }
  };

  const confirmSignOut = () => {
    Alert.alert('sign out?', 'you can sign back in with your username.', [
      { text: 'cancel', style: 'cancel' },
      { text: 'sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'delete account?',
      'this permanently deletes your account, photos, packs, and all data. this cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete forever',
          style: 'destructive',
          onPress: () => {
            Alert.alert('request received', 'your account deletion request has been sent to support.');
          },
        },
      ],
    );
  };

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => !k.includes('session') && !k.includes('settings'));
      if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
      Alert.alert('cache cleared', 'temporary data has been removed.');
    } catch {
      Alert.alert('failed', 'could not clear cache.');
    }
  };

  const downloadData = () => {
    Alert.alert('data export', 'we are preparing your data export. you will receive an email within 48 hours.');
  };

  const contactSupport = () => {
    nav.navigate('ContactUs');
  };

  const reportBug = () => {
    nav.navigate('ReportBug');
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <ScaledText style={styles.title}>settings</ScaledText>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 14, paddingBottom: 40 }}>
        {/* Avatar */}
        <Pressable onPress={onPickPhoto} style={styles.avatarRow}>
          <View style={styles.avatar}>
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <ScaledText style={styles.avatarInitials}>{user.username.slice(0, 2).toUpperCase()}</ScaledText>
            )}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ScaledText style={styles.avatarLabel}>@{user.username}</ScaledText>
            <ScaledText style={styles.avatarHint}>tap to change profile photo</ScaledText>
          </View>
          <Ionicons name="camera-outline" size={18} color={colors.textFade} />
        </Pressable>

        {/* Account */}
        <Section title="account">
          <NavRow icon="person-outline" label="username" value={'@' + user.username} />
          {user.email && <NavRow icon="mail-outline" label="email" value={user.email} />}
          <NavRow icon="location-outline" label="location" value={`${user.city}, ${user.country}`} />
          <NavRow icon="flame-outline" label="streak" value={`${user.streakDays}d`} />
          {user.isAdmin && (
            <NavRow icon="shield-checkmark" label="admin" value="active" accentColor={colors.yellow} />
          )}
        </Section>

        {/* Pro */}
        <Section title="flash. pro">
          <NavRow
            icon="flash-outline"
            label={user.isPro ? 'manage subscription' : 'upgrade to pro'}
            value={user.isPro ? 'active' : undefined}
            accentColor={colors.yellow}
            onPress={() => nav.navigate('Pro')}
          />
        </Section>

        {/* Invites */}
        <Section title="invites">
          <NavRow icon="ticket-outline" label="your code" value={user.inviteCode} />
          <NavRow icon="people-outline" label="manage invites" onPress={() => nav.navigate('Invite')} />
        </Section>

        {/* Admin */}
        {user.isAdmin && (
          <Section title="admin">
            <NavRow
              icon="shield-checkmark-outline"
              label="admin panel"
              accentColor={colors.yellow}
              onPress={() => nav.navigate('Admin')}
            />
          </Section>
        )}

        {/* Notifications */}
        <Section title="notifications">
          <NavRow
            icon="notifications-outline"
            label="notification settings"
            onPress={() => nav.navigate('NotificationSettings')}
          />
        </Section>

        {/* Privacy */}
        <Section title="privacy">
          <NavRow
            icon="eye-outline"
            label="privacy settings"
            onPress={() => nav.navigate('PrivacySettings')}
          />
        </Section>

        {/* Accessibility */}
        <Section title="accessibility">
          <NavRow
            icon="hand-left-outline"
            label="accessibility settings"
            onPress={() => nav.navigate('AccessibilitySettings')}
          />
        </Section>

        {/* Legal */}
        <Section title="legal">
          <NavRow icon="briefcase-outline" label="legal documents" onPress={() => nav.navigate('LegalMenu')} />
        </Section>

        {/* Support */}
        <Section title="support">
          <NavRow icon="mail-outline" label="contact us" onPress={contactSupport} />
          <NavRow icon="bug-outline" label="report a bug" onPress={reportBug} />
        </Section>

        {/* Data & Security */}
        <Section title="data & security">
          <NavRow
            icon="shield-checkmark-outline"
            label="data & security settings"
            onPress={() => nav.navigate('DataSecuritySettings')}
          />
        </Section>

        {/* About */}
        <Section title="about">
          <NavRow icon="information-circle-outline" label="version" value="1.0.0 · production" />
          <NavRow icon="code-slash-outline" label="open source licenses" />
          <NavRow icon="globe-outline" label="website" value="flash.app" />
        </Section>

        {/* Danger */}
        <Section title="danger">
          <NavRow icon="log-out-outline" label="sign out" destructive onPress={confirmSignOut} />
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
  rowValue: { color: colors.textFade, fontSize: 12, marginRight: 4 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.yellow,
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarInitials: { color: colors.white, fontSize: 16, fontWeight: '700' },
  avatarLabel: { color: colors.white, fontSize: 14, fontWeight: '600' },
  avatarHint: { color: colors.textFade, fontSize: 11 },
});
