import React from 'react';
import { View, ScrollView } from 'react-native';
import { useSettings } from '../hooks/useSettings';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, Section, settingsStyles } from '../components/settings';

export default function NotificationSettingsScreen() {
  const { settings, patch } = useSettings();

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  const pushDisabled = !s.pushNotifications;
  const inAppDisabled = !s.inAppNotifications;
  const emailDisabled = !s.emailNotifications;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title="notification settings" />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
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
