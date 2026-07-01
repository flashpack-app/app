import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from '../services/haptics';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { useSettings } from '../hooks/useSettings';
import ScaledText from '../components/ScaledText';
import ScreenHeader from '../components/ScreenHeader';
import { ToggleRow, NavRow, Section } from '../components/settings';
import { useSettingsStyles } from '../components/settings';

export default function SettingsScreen() {
  const nav = useNavigation<any>();
  const { user, signOut, updateAvatar } = useAppState();
  const { settings } = useSettings();
  const colors = useColors();
  const settingsStyles = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);

  if (!user) return <View style={settingsStyles.wrap} />;

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
        const dir = FileSystem.documentDirectory ?? '';
        const dest = `${dir}avatar-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
        updateAvatar(dest);
      } catch (err) {
        console.error('Error copying avatar image:', err);
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

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title="settings" />

      <ScrollView contentContainerStyle={settingsStyles.scroll}>
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
          <NavRow icon="mail-outline" label="contact us" onPress={() => nav.navigate('ContactUs')} />
          <NavRow icon="bug-outline" label="report a bug" onPress={() => nav.navigate('ReportBug')} />
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

const makeStyles = (colors: Palette) => StyleSheet.create({
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
    backgroundColor: colors.surfaceMid,
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
