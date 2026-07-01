import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
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
import { APIService } from '../services/api';
import { useAppState } from '../state/AppState';

// Simple flag lookup for common countries
const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', TR: '🇹🇷', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹',
  NL: '🇳🇱', BE: '🇧🇪', CH: '🇨🇭', AT: '🇦🇹', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰',
  FI: '🇫🇮', PL: '🇵🇱', CZ: '🇨🇿', HU: '🇭🇺', RO: '🇷🇴', BG: '🇧🇬', HR: '🇭🇷',
  SI: '🇸🇮', SK: '🇸🇰', LT: '🇱🇹', LV: '🇱🇻', EE: '🇪🇪', IE: '🇮🇪', PT: '🇵🇹',
  GR: '🇬🇷', CY: '🇨🇾', MT: '🇲🇹', LU: '🇱🇺', JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳',
  IN: '🇮🇳', BR: '🇧🇷', MX: '🇲🇽', CA: '🇨🇦', AU: '🇦🇺', NZ: '🇳🇿', RU: '🇷🇺',
  UA: '🇺🇦', ZA: '🇿🇦', EG: '🇪🇬', IL: '🇮🇱', AE: '🇦🇪', SA: '🇸🇦', QA: '🇶🇦',
  SG: '🇸🇬', TH: '🇹🇭', VN: '🇻🇳', ID: '🇮🇩', MY: '🇲🇾', PH: '🇵🇭', PK: '🇵🇰',
  BD: '🇧🇩', AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', PE: '🇵🇪', VE: '🇻🇪', EC: '🇪🇨',
};

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

async function geoFromGPS(): Promise<{ city: string; country: string; flag: string } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  const { latitude, longitude } = loc.coords;
  const res = await fetchWithTimeout(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
  );
  const data = await res.json();
  const city = data?.city ?? data?.locality ?? 'unknown';
  const countryCode = data?.countryCode ?? '';
  if (!countryCode) return null;
  return {
    city: String(city).toLowerCase(),
    country: countryCode,
    flag: COUNTRY_FLAGS[countryCode] ?? '🌍',
  };
}

async function geoFromIP(): Promise<{ city: string; country: string; flag: string } | null> {
  try {
    const res = await fetchWithTimeout('https://ipapi.co/json/', 4000);
    const data = await res.json();
    const city = data?.city ?? 'unknown';
    const countryCode = data?.country_code ?? '';
    if (!countryCode) return null;
    return {
      city: String(city).toLowerCase(),
      country: countryCode,
      flag: COUNTRY_FLAGS[countryCode] ?? '🌍',
    };
  } catch {
    return null;
  }
}

async function getLocationExtras(): Promise<{ city?: string; country?: string; flag?: string }> {
  try {
    const gps = await geoFromGPS();
    if (gps) return gps;
  } catch {}
  try {
    const ip = await geoFromIP();
    if (ip) return ip;
  } catch {}
  return {};
}

const VALID = /^[a-z0-9_.\-]{2,20}$/;

const REASON_TEXT: Record<string, string> = {
  username_taken: 'that username is taken.',
  invalid_format: 'invite code is invalid.',
  not_found: "invite code doesn't exist.",
  already_used: 'invite code already used.',
  no_slots: 'inviter is out of slots.',
};

export default function UsernameScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const code = route.params?.code as string;
  const { signIn } = useAppState();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clean = username.trim().toLowerCase();
  const valid = VALID.test(clean);

  const onJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      const extras = await getLocationExtras();
      const { user, token } = await APIService.redeemInvite(code, clean, extras);
      await signIn({ user, token }, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const reason = e?.body?.error ?? '';
      setError(REASON_TEXT[reason] ?? e?.message ?? 'something went wrong.');
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
        <Text style={styles.subtitle}>pick a username. you can't change it later.</Text>

        <View style={styles.inputRow}>
          <Text style={styles.at}>@</Text>
          <TextInput
            value={username}
            onChangeText={(t) => {
              setError(null);
              setUsername(t);
            }}
            placeholder="yourname"
            placeholderTextColor="rgba(255,255,255,0.18)"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            maxLength={20}
          />
        </View>
        <Text style={styles.hint}>2–20 chars · a-z, 0-9, _ . -</Text>
        {error && <Text style={styles.error}>{error}</Text>}

        <PillButton
          label="join"
          onPress={onJoin}
          variant="yellow"
          disabled={!valid || loading}
          loading={loading}
          style={{ width: '100%', height: 44 }}
        />

        <Text style={styles.codeFootnote}>
          using <Text style={styles.codeMono}>{code}</Text>
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
  at: { color: colors.yellow, fontSize: 16, fontWeight: '700', marginRight: 4 },
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
