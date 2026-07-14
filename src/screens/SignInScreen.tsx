import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashLogo from '../components/FlashLogo';
import PillButton from '../components/PillButton';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { loadSettings } from '../services/settingsStore';
import {
  isBiometricAvailable,
  promptBiometric,
  getBiometricUsername,
} from '../services/biometric';
import { t } from '../services/i18n';

export default function SignInScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [showBio, setShowBio] = useState(false);

  const clean = username.trim().toLowerCase();
  const valid = clean.length >= 2;

  useEffect(() => {
    (async () => {
      const settings = await loadSettings();
      if (!settings.biometricLogin) return;
      const savedUser = await getBiometricUsername();
      if (!savedUser) return;
      const available = await isBiometricAvailable();
      if (!available) return;
      setShowBio(true);
      // auto-prompt after short delay
      const t = setTimeout(() => handleBiometricLogin(savedUser), 400);
      return () => clearTimeout(t);
    })();
  }, []);

  const goToOtp = () => {
    nav.navigate('OTPScreen', { username: clean });
  };

  const handleBiometricLogin = async (savedUser?: string) => {
    const u = savedUser ?? (await getBiometricUsername());
    if (!u) return;
    const ok = await promptBiometric();
    if (ok) {
      nav.navigate('OTPScreen', { username: u });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.center}>
        <FlashLogo size={36} />
        <Text style={styles.subtitle}>{t('welcomeBackUsername')}</Text>

        <View style={styles.inputRow}>
          <Text style={styles.at}>@</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder={t('yournamePlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.18)"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            maxLength={20}
          />
        </View>

        <PillButton
          label={t('onboarding_next')}
          onPress={goToOtp}
          variant="yellow"
          disabled={!valid}
          style={{ width: '100%', height: 44 }}
        />

        {showBio && (
          <Pressable
            onPress={() => handleBiometricLogin()}
            style={styles.bioBtn}
          >
            <Ionicons name="finger-print" size={20} color={colors.yellow} />
            <Text style={styles.bioText}>{t('signInBiometrics')}</Text>
          </Pressable>
        )}

        <Text style={styles.note}>{t('otpSignInNote')}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: { paddingTop: 12, paddingHorizontal: 12 },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, gap: 14 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 48,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  at: { color: colors.yellow, fontSize: 16, fontWeight: '700', marginRight: 4 },
  input: { flex: 1, color: colors.white, fontSize: 16, fontWeight: '600' },
  error: { color: colors.red, fontSize: 11 },
  note: { color: colors.textHint, fontSize: 9, marginTop: 12, textAlign: 'center' },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 44,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.3)',
    backgroundColor: 'rgba(255,214,10,0.06)',
  },
  bioText: { color: colors.yellow, fontSize: 13, fontWeight: '600' },
});
