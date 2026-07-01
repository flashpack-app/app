import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { useAppState } from '../state/AppState';
import { useSettings } from '../hooks/useSettings';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, NavRow, Section, settingsStyles } from '../components/settings';

export default function PrivacySettingsScreen() {
  const { user } = useAppState();
  const { settings, patch } = useSettings();

  const toggleSilentMode = (v: boolean) => {
    if (v && !user?.isPro) {
      Alert.alert('pro feature', 'silent mode is available with flash. pro.');
      return;
    }
    patch({ silentMode: v });
  };

  const s = settings;
  if (!s) return <View style={settingsStyles.wrap} />;

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title="privacy settings" />
      <ScrollView contentContainerStyle={settingsStyles.scroll}>
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
