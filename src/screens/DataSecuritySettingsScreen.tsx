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
import { t } from '../services/i18n';

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
          Alert.alert(t('settings_not_available_title'), t('settings_not_available_body'));
          return;
        }
        const ok = await promptBiometric();
        if (!ok) return;
        patch({ biometricLogin: true });
        if (user) await saveBiometricUsername(user.username);
        Alert.alert(t('settings_biometric_enabled_title'), t('settings_biometric_enabled_body'));
      } else {
        patch({ biometricLogin: false });
        await clearBiometricUsername();
      }
    } catch (error) {
      console.error('failed to update biometric settings:', error);
      Alert.alert(t('settings_biometric_error_title'), t('settings_biometric_error_body'));
    }
  };

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title={t('settings_data_security_title')} />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
        <Section title={t('settings_security_section')}>
          <ToggleRow
            icon="finger-print-outline"
            label={bioAvailable === false ? t('settings_biometric_login_not_available') : t('settings_biometric_login')}
            value={s.biometricLogin}
            onToggle={toggleBiometric}
          />
          <ToggleRow
            icon="key-outline"
            label={t('settings_two_factor_auth_label')}
            value={s.twoFactorAuth}
            onToggle={(v) => {
              patch({ twoFactorAuth: v });
              if (v) Alert.alert(t('settings_two_factor_alert_title'), t('settings_two_factor_alert_body'));
            }}
          />
          <NavRow
            icon="time-outline"
            label={t('settings_active_sessions_label')}
            value={t('settings_active_sessions_value')}
            onPress={() => Alert.alert(t('settings_active_sessions_label'), t('settings_active_sessions_alert_body'))}
          />
          <NavRow
            icon="lock-closed-outline"
            label={t('settings_change_password_label')}
            onPress={() => Alert.alert(t('settings_change_password_label'), t('settings_change_password_alert_body'))}
          />
        </Section>

        <Section title={t('settings_data_section')}>
          <NavRow icon="download-outline" label={t('settings_download_data_label')} onPress={downloadData} />
          <NavRow icon="trash-outline" label={t('settings_clear_cache_label')} onPress={clearCache} />
        </Section>

        <Section title={t('dangerSection')}>
          <NavRow
            icon="skull-outline"
            label={t('settings_delete_account_label')}
            destructive
            onPress={confirmDeleteAccount}
          />
        </Section>
      </ScrollView>
    </View>
  );
}
