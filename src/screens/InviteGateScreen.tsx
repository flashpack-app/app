import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from '../services/haptics';
import { useNavigation } from '@react-navigation/native';
import FlashLogo from '../components/FlashLogo';
import PillButton from '../components/PillButton';
import { colors } from '../theme/colors';
import { APIService } from '../services/api';

const FORMAT = /^FLASH-[A-Z0-9]{3}-[A-Z0-9]{2}$/;
const PLACEHOLDER = 'FLASH-___-__';

// Auto-format: take any input, strip non-alphanumerics, prepend FLASH if missing,
// re-insert dashes after positions 5 and 8 (FLASH-XXX-XX).
function formatCode(input: string): string {
  const stripped = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // If user is typing the body without "FLASH" prefix, treat the whole thing as the body.
  const body = stripped.startsWith('FLASH') ? stripped.slice(5) : stripped;
  const trimmed = body.slice(0, 5);
  if (trimmed.length === 0) return '';
  if (trimmed.length <= 3) return `FLASH-${trimmed}`;
  return `FLASH-${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
}

const REASON_TEXT: Record<string, string> = {
  invalid_format: 'invalid format.',
  not_found: "that code doesn't exist.",
  already_used: 'this code has already been used.',
  no_slots: "the inviter is out of slots.",
  missing_code: 'enter a code.',
};

export default function InviteGateScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigation<any>();

  const valid = FORMAT.test(code);

  const onChange = (t: string) => {
    setError(null);
    setCode(formatCode(t));
  };

  const onContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await APIService.verifyInvite(code);
      if (!res.valid) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(REASON_TEXT[res.reason ?? ''] ?? "that code didn't work.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      nav.navigate('OTPScreen', { inviteCode: code });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.message ?? 'network error. is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.center}>
        <FlashLogo size={42} />
        <Text style={styles.subtitle}>invite only. get a code from a friend.</Text>

        <TextInput
          value={code}
          onChangeText={onChange}
          placeholder={PLACEHOLDER}
          placeholderTextColor="rgba(255,255,255,0.18)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          style={styles.input}
        />
        {error && <Text style={styles.error}>{error}</Text>}

        <PillButton
          label="continue"
          onPress={onContinue}
          variant="yellow"
          disabled={!valid || loading}
          loading={loading}
          style={{ width: '100%', height: 44 }}
        />

        <Text style={styles.footer}>no code? ask a friend who's in.</Text>

        <Text style={styles.signInRow}>
          already have an account?{' '}
          <Text style={styles.signInLink} onPress={() => nav.navigate('SignIn')}>
            sign in
          </Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 18,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    color: colors.white,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 15,
    letterSpacing: 2,
  },
  error: { color: colors.red, fontSize: 11 },
  footer: {
    color: 'rgba(255,255,255,0.18)',
    fontSize: 10,
    marginTop: 24,
  },
  signInRow: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  signInLink: {
    color: colors.yellow,
    fontWeight: '700',
  },
});
