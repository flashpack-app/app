import React, { useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useAppState } from '../state/AppState';
import { useSettings } from '../hooks/useSettings';
import {
  isBiometricAvailable,
  promptBiometric,
  saveBiometricUsername,
  clearBiometricUsername,
} from '../services/biometric';
import { clearCache, downloadData, confirmDeleteAccount } from '../services/accountActions';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, NavRow, Section, useSettingsStyles } from '../components/settings';

export default function DataSecuritySettingsScreen() {
  const { user } = useAppState();
  const { settings, patch } = useSettings();
  const settingsStyles = useSettingsStyles();
  const [bioAvailable, setBioAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

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
    } catch (error) {
      console.error('failed to update biometric settings:', error);
      Alert.alert('error', 'biometric authentication failed. try again.');
    }
  };

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title="data & security" />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
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
