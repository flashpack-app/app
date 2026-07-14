import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashLogo from '../components/FlashLogo';
import PillButton from '../components/PillButton';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    throw new Error('timeout');
  }
}

async function getLocationExtras() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    const geo = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    );
    const data = await geo.json();
    return {
      city: data.address?.city || data.address?.town || data.address?.village || null,
      country: data.address?.country || null,
      flag: data.address?.country_code?.toUpperCase() || null,
    };
  } catch {
    return null;
  }
}

export default function EmailScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const username = route.params?.username as string;
  const inviteCode = route.params?.inviteCode as string;

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = EMAIL_REGEX.test(email.trim());

  const onJoin = async () => {
    if (!emailValid) {
      setError('please enter a valid email address');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const extras = await getLocationExtras();
      nav.navigate('OTPScreen', { username, email: email.trim().toLowerCase(), inviteCode, extras });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
      </View>
      <View style={styles.center}>
        <FlashLogo size={36} />
        <Text style={styles.subtitle}>add your email for verification.</Text>

        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={18} color={colors.yellow} style={styles.inputIcon} />
          <TextInput
            value={email}
            onChangeText={(t) => {
              setError(null);
              setEmail(t);
            }}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.18)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={onJoin}
          />
        </View>
        <Text style={styles.hint}>we'll send a one-time code to this address</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <PillButton
          label="continue"
          onPress={onJoin}
          variant="yellow"
          disabled={!emailValid || loading}
          loading={loading}
          style={{ width: '100%', height: 44 }}
        />

        <Text style={styles.codeFootnote}>
          using <Text style={styles.codeMono}>{inviteCode}</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: { paddingTop: 12, paddingHorizontal: 12 },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 14,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
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
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: { color: colors.textHint, fontSize: 10 },
  error: { color: colors.red, fontSize: 11 },
  codeFootnote: { color: colors.textHint, fontSize: 10, marginTop: 18 },
  codeMono: {
    color: colors.textSecondary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});
