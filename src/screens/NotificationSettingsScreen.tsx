import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSettings } from '../hooks/useSettings';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, Section, useSettingsStyles } from '../components/settings';
import { t } from '../services/i18n';

export default function NotificationSettingsScreen() {
  const { settings, patch } = useSettings();
  const settingsStyles = useSettingsStyles();

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  const pushDisabled = !s.pushNotifications;
  const inAppDisabled = !s.inAppNotifications;
  const emailDisabled = !s.emailNotifications;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title={t('settings_notifications_title')} />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
        <Section title={t('settings_push_notifications_section')}>
          <ToggleRow
            icon="phone-portrait-outline"
            label={t('settings_enable_push_label')}
            value={s.pushNotifications}
            onToggle={(v) => patch({ pushNotifications: v })}
          />
          <ToggleRow
            icon="cube-outline"
            label={t('settings_new_packs_label')}
            value={s.pushNewPacks}
            onToggle={(v) => patch({ pushNewPacks: v })}
            disabled={pushDisabled}
          />
          <ToggleRow
            icon="chatbubble-outline"
            label={t('settings_comments_label')}
            value={s.pushComments}
            onToggle={(v) => patch({ pushComments: v })}
            disabled={pushDisabled}
          />
          <ToggleRow
            icon="heart-outline"
            label={t('settings_reactions_label')}
            value={s.pushReactions}
            onToggle={(v) => patch({ pushReactions: v })}
            disabled={pushDisabled}
          />
          <ToggleRow
            icon="flame-outline"
            label={t('settings_streak_reminders_label')}
            value={s.pushStreakReminders}
            onToggle={(v) => patch({ pushStreakReminders: v })}
            disabled={pushDisabled}
          />
        </Section>

        <Section title={t('settings_in_app_notifications_section')}>
          <ToggleRow
            icon="tv-outline"
            label={t('settings_enable_in_app_label')}
            value={s.inAppNotifications}
            onToggle={(v) => patch({ inAppNotifications: v })}
          />
          <ToggleRow
            icon="cube-outline"
            label={t('settings_new_packs_label')}
            value={s.inAppNewPacks}
            onToggle={(v) => patch({ inAppNewPacks: v })}
            disabled={inAppDisabled}
          />
          <ToggleRow
            icon="chatbubble-outline"
            label={t('settings_comments_label')}
            value={s.inAppComments}
            onToggle={(v) => patch({ inAppComments: v })}
            disabled={inAppDisabled}
          />
        </Section>

        <Section title={t('settings_email_section')}>
          <ToggleRow
            icon="mail-outline"
            label={t('settings_enable_email_label')}
            value={s.emailNotifications}
            onToggle={(v) => patch({ emailNotifications: v })}
          />
          <ToggleRow
            icon="newspaper-outline"
            label={t('settings_weekly_digest_label')}
            value={s.emailWeeklyDigest}
            onToggle={(v) => patch({ emailWeeklyDigest: v })}
            disabled={emailDisabled}
          />
        </Section>

        <Section title={t('settings_alerts_section')}>
          <ToggleRow
            icon="camera-outline"
            label={t('settings_screenshot_warnings_label')}
            value={s.screenshotWarnings}
            onToggle={(v) => patch({ screenshotWarnings: v })}
          />
          <ToggleRow
            icon="volume-high-outline"
            label={t('settings_sound_effects_label')}
            value={s.soundEffects}
            onToggle={(v) => patch({ soundEffects: v })}
          />
          <ToggleRow
            icon="pulse-outline"
            label={t('settings_vibration_label')}
            value={s.vibration}
            onToggle={(v) => patch({ vibration: v })}
          />
        </Section>
      </ScrollView>
    </View>
  );
}
