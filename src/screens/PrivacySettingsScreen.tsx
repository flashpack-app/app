import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useAppState } from '../state/AppState';
import { useSettings } from '../hooks/useSettings';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, NavRow, Section, useSettingsStyles } from '../components/settings';
import { t } from '../services/i18n';

export default function PrivacySettingsScreen() {
  const { user } = useAppState();
  const { settings, patch } = useSettings();
  const settingsStyles = useSettingsStyles();

  const toggleSilentMode = (v: boolean) => {
    if (v && !user?.isPro) {
      Alert.alert(t('settings_pro_feature_title'), t('settings_pro_feature_body'));
      return;
    }
    patch({ silentMode: v });
  };

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title={t('settings_privacy_title')} />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
        <Section title={t('settings_profile_visibility_section')}>
          <ToggleRow
            icon="eye-outline"
            label={t('settings_public_profile_label')}
            value={s.profilePublic}
            onToggle={(v) => patch({ profilePublic: v })}
          />
          <ToggleRow
            icon="location-outline"
            label={t('settings_show_location_label')}
            value={s.showLocation}
            onToggle={(v) => patch({ showLocation: v })}
          />
          <ToggleRow
            icon="flame-outline"
            label={t('settings_show_streak_public_label')}
            value={s.showStreakPublic}
            onToggle={(v) => patch({ showStreakPublic: v })}
          />
          <ToggleRow
            icon="radio-button-on-outline"
            label={t('settings_show_activity_status_label')}
            value={s.showActivityStatus}
            onToggle={(v) => patch({ showActivityStatus: v })}
          />
          <ToggleRow
            icon="at-outline"
            label={t('settings_allow_mentions_label')}
            value={s.allowMentions}
            onToggle={(v) => patch({ allowMentions: v })}
          />
        </Section>

        <Section title={t('settings_pro_section')}>
          <ToggleRow
            icon="eye-off-outline"
            label={user?.isPro ? t('settings_silent_mode_label') : t('settings_silent_mode_pro_label')}
            value={s.silentMode}
            onToggle={toggleSilentMode}
          />
        </Section>

        <Section title={t('settings_content_section')}>
          <ToggleRow
            icon="images-outline"
            label={t('settings_auto_save_camera_roll_label')}
            value={s.autoSaveCameraRoll}
            onToggle={(v) => patch({ autoSaveCameraRoll: v })}
          />
          <ToggleRow
            icon="grid-outline"
            label={t('settings_show_pack_previews_label')}
            value={s.showPackPreviews}
            onToggle={(v) => patch({ showPackPreviews: v })}
          />
          <ToggleRow
            icon="shield-outline"
            label={t('settings_block_screenshots_label')}
            value={s.blockScreenshots}
            onToggle={(v) => {
              patch({ blockScreenshots: v });
              if (v) Alert.alert(t('settings_block_screenshots_alert_title'), t('settings_block_screenshots_alert_body'));
            }}
          />
        </Section>

        <Section title={t('settings_blocked_users_section')}>
          <NavRow
            icon="ban-outline"
            label={t('settings_manage_blocked_users_label')}
            onPress={() => Alert.alert(t('settings_manage_blocked_users_label'), t('settings_blocked_users_alert_body'))}
          />
        </Section>
      </ScrollView>
    </View>
  );
}
