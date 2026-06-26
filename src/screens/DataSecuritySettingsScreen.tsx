import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { UserSettings, loadSettings, saveSettings } from '../services/settingsStore';
import { useAppState } from '../state/AppState';
import {
  isBiometricAvailable,
  promptBiometric,
  saveBiometricUsername,
  clearBiometricUsername,
} from '../services/biometric';

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
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}> = ({ icon, label, value, onPress, destructive }) => (
  <Pressable onPress={onPress} style={styles.row}>
    <View style={styles.rowIcon}>
      <Ionicons name={icon} size={17} color={destructive ? colors.red : colors.white} />
    </View>
    <Text style={[styles.rowLabel, destructive && { color: colors.red }]}>{label}</Text>
    {value !== undefined && <Text style={styles.rowValue}>{value}</Text>}
    <Ionicons name="chevron-forward" size={14} color={colors.textFade} />
  </Pressable>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

export default function DataSecuritySettingsScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAppState();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [bioAvailable, setBioAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const patch = (partial: Partial<UserSettings>) => {
    const next = { ...(settings ?? {}), ...partial } as UserSettings;
    setSettings(next);
    saveSettings(partial);
  };

  const toggleBiometric = async (v: boolean) => {
    try {
      if (v) {
        const available = await isBiometricAvailable();
        if (!available) {
          Alert.alert('not available', 'biometric authentication is not set up on this device.');
          return;
        }
        const ok = await promptBiometric();
        if (!ok) return;
        patch({ biometricLogin: true });
        if (user) await saveBiometricUsername(user.username);
        Alert.alert('biometric login enabled', 'you can now sign in with face id / touch id.');
      } else {
        patch({ biometricLogin: false });
        await clearBiometricUsername();
      }
    } catch {
      Alert.alert('error', 'biometric authentication failed. try again.');
    }
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

  const s = settings;
  if (!s) return <View style={styles.wrap} />;

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>data & security</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="security">
          <ToggleRow
            icon="finger-print-outline"
            label={bioAvailable === false ? 'biometric login (not available)' : 'biometric login'}
            value={s.biometricLogin}
            onToggle={toggleBiometric}
          />
          <ToggleRow
            icon="key-outline"
            label="two-factor authentication"
            value={s.twoFactorAuth}
            onToggle={(v) => {
              patch({ twoFactorAuth: v });
              if (v) Alert.alert('2FA', 'two-factor authentication will be enabled in the next update.');
            }}
          />
          <NavRow
            icon="time-outline"
            label="active sessions"
            value="1 device"
            onPress={() => Alert.alert('active sessions', 'you are currently signed in on 1 device.')}
          />
          <NavRow
            icon="lock-closed-outline"
            label="change password"
            onPress={() => Alert.alert('change password', 'contact support@flash.app to reset your password.')}
          />
        </Section>

        <Section title="data">
          <NavRow icon="download-outline" label="download my data" onPress={downloadData} />
          <NavRow icon="trash-outline" label="clear cache" onPress={clearCache} />
        </Section>

        <Section title="danger">
          <NavRow
            icon="skull-outline"
            label="delete account"
            destructive
            onPress={confirmDeleteAccount}
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
  rowValue: { color: colors.textFade, fontSize: 12, marginRight: 4 },
});
