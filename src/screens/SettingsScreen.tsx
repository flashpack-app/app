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
import { resetOnboarding } from '../services/onboardingStore';
import { useCoachmark } from '../onboarding/CoachmarkContext';
import { t } from '../services/i18n';

export default function SettingsScreen() {
  const nav = useNavigation<any>();
  const { user, signOut, updateAvatar, setIsOnboarding } = useAppState();
  const { settings } = useSettings();
  const colors = useColors();
  const settingsStyles = useSettingsStyles();
  const styles = useThemedStyles(makeStyles);
  const { startOnboarding } = useCoachmark();

  if (!user) return <View style={settingsStyles.wrap} />;

  const onPickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionNeeded'), t('allowPhotoAccess'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      let uploadUri = result.assets[0].uri;
      try {
        const dir = FileSystem.documentDirectory ?? '';
        const dest = `${dir}avatar-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
        uploadUri = dest;
      } catch (err) {
        console.warn('failed to copy avatar image; using picker URI:', err);
      }
      try {
        await updateAvatar(uploadUri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert('photo not updated', 'check your connection and try again.');
      }
    }
  };

  const onReplayTutorial = () => {
    Alert.alert(
      t('replayTutorialConfirmTitle'),
      t('replayTutorialConfirmSub'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('replayLabel'),
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await resetOnboarding();
              setIsOnboarding(true);
            } catch (error) {
              console.error('failed to reset onboarding:', error);
              Alert.alert('tutorial not reset', 'please try again.');
            }
          },
        },
      ],
    );
  };

  const confirmSignOut = () => {
    Alert.alert(t('signOutConfirmTitle'), t('signOutConfirmSub'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOutLabel'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={settingsStyles.wrap}>
      <ScreenHeader title={t('settingsTitle')} />

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
            <ScaledText style={styles.avatarHint}>{t('tapToChangePhoto')}</ScaledText>
          </View>
          <Ionicons name="camera-outline" size={18} color={colors.textFade} />
        </Pressable>

         <Section title={t('accountSection')}>
           <NavRow icon="person-outline" label={t('usernameLabel')} value={'@' + user.username} />
           <NavRow 
             icon="phone-portrait-outline" 
             label="phone number" 
             value={user.phoneNumber ? `${user.phoneNumber}  ✓` : 'add phone number'} 
             onPress={!user.phoneNumber ? () => nav.navigate('PhoneNumberScreen', { username: user.username }) : undefined}
           />
           <NavRow 
             icon="mail-outline" 
             label={t('emailLabel')} 
             value={user.email ? `${user.email}  ✓` : 'add email'} 
             onPress={!user.email ? () => nav.navigate('EmailScreen', { username: user.username }) : undefined}
           />
          <NavRow icon="location-outline" label={t('locationLabel')} value={`${user.city}, ${user.country}`} />
          <NavRow icon="flame-outline" label={t('streakLabel')} value={t('streakDays', { count: user.streakDays })} />
          {user.isAdmin && (
            <NavRow icon="shield-checkmark" label={t('adminLabel')} value={t('adminActive')} accentColor={colors.yellow} />
          )}
        </Section>

        {/* Pro */}
        <Section title={t('proSection')}>
          <NavRow
            icon="flash-outline"
            label={user.isPro ? t('manageSubscription') : t('upgradeToPro')}
            value={user.isPro ? t('adminActive') : undefined}
            accentColor={colors.yellow}
            onPress={() => nav.navigate('Pro')}
          />
        </Section>

        {/* Invites */}
        <Section title={t('invitesSection')}>
          <NavRow icon="ticket-outline" label={t('yourCodeLabel')} value={user.inviteCode} />
          <NavRow icon="people-outline" label={t('manageInvitesLabel')} onPress={() => nav.navigate('Invite')} />
        </Section>

        {/* Admin */}
        {user.isAdmin && (
          <Section title={t('adminSection')}>
            <NavRow
              icon="shield-checkmark-outline"
              label={t('adminPanelLabel')}
              accentColor={colors.yellow}
              onPress={() => nav.navigate('Admin')}
            />
          </Section>
        )}

        {/* Notifications */}
        <Section title={t('notificationsSection')}>
          <NavRow
            icon="notifications-outline"
            label={t('notificationSettingsLabel')}
            onPress={() => nav.navigate('NotificationSettings')}
          />
        </Section>

        {/* Privacy */}
        <Section title={t('privacySection')}>
          <NavRow
            icon="eye-outline"
            label={t('privacySettingsLabel')}
            onPress={() => nav.navigate('PrivacySettings')}
          />
        </Section>

        {/* Accessibility */}
        <Section title={t('accessibilitySection')}>
          <NavRow
            icon="hand-left-outline"
            label={t('accessibilitySettingsLabel')}
            onPress={() => nav.navigate('AccessibilitySettings')}
          />
          <NavRow
            icon="globe-outline"
            label={t('language')}
            value={
              settings?.language === 'tr'
                ? '🇹🇷 Türkçe'
                : settings?.language === 'en'
                ? '🇬🇧 English'
                : '⚙️ system'
            }
            onPress={() => nav.navigate('AccessibilitySettings')}
          />
        </Section>

        {/* Legal */}
        <Section title={t('legalSection')}>
          <NavRow icon="briefcase-outline" label={t('legalDocumentsLabel')} onPress={() => nav.navigate('LegalMenu')} />
        </Section>

        {/* Support */}
        <Section title={t('supportSection')}>
          <NavRow icon="mail-outline" label={t('contactUsLabel')} onPress={() => nav.navigate('ContactUs')} />
          <NavRow icon="bug-outline" label={t('reportBugLabel')} onPress={() => nav.navigate('ReportBug')} />
        </Section>

        {/* Data & Security */}
        <Section title={t('dataSecuritySection')}>
          <NavRow
            icon="shield-checkmark-outline"
            label={t('dataSecuritySettingsLabel')}
            onPress={() => nav.navigate('DataSecuritySettings')}
          />
        </Section>

        {/* Tutorial */}
        <Section title={t('tutorialSection')}>
          <NavRow
            icon="refresh-outline"
            label={t('replayTutorialLabel')}
            onPress={onReplayTutorial}
          />
        </Section>

        {/* About */}
        <Section title={t('aboutSection')}>
          <NavRow icon="information-circle-outline" label={t('versionLabel')} value={t('versionValue')} />
          <NavRow icon="code-slash-outline" label={t('openSourceLicensesLabel')} />
          <NavRow icon="globe-outline" label={t('websiteLabel')} value="flash.app" />
        </Section>

        {/* Danger */}
        <Section title={t('dangerSection')}>
          <NavRow icon="log-out-outline" label={t('signOutLabel')} destructive onPress={confirmSignOut} />
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
