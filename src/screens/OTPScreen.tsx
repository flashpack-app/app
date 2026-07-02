import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import * as Haptics from '../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashLogo from '../components/FlashLogo';
import PillButton from '../components/PillButton';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { APIService } from '../services/api';
import { useAppState } from '../state/AppState';

export default function OTPScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { signIn } = useAppState();

  const username = route.params?.username as string | undefined;
  const inviteCode = route.params?.inviteCode as string | undefined;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const isLogin = !!username;
  const isSignup = !!inviteCode;

  useEffect(() => {
    // auto-focus hidden input
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Request a code for this subject as soon as the screen opens.
    APIService.sendOTP({ username, inviteCode })
      .then((res) => {
        if (res.devCode) setDevCode(res.devCode);
      })
      .catch((e: any) => {
        setError(e?.body?.error === 'rate_limited'
          ? 'too many codes requested. wait a bit.'
          : "couldn't send a code. try again.");
      });
  }, [username, inviteCode]);

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);

    try {
      const { user, token } = await APIService.verifyOTP({ username, inviteCode, code: otp });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isLogin && user && token) {
        await signIn({ user, token });
      } else if (isSignup && inviteCode) {
        nav.navigate('Username', { code: inviteCode });
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const reason = e?.body?.error ?? '';
      setError(
        reason === 'expired' ? 'code expired. go back and try again.'
        : reason === 'too_many_attempts' ? 'too many tries. request a new code.'
        : reason === 'not_found' ? 'user not found.'
        : 'invalid code.',
      );
    }
    setLoading(false);
  };

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setError(null);
    setOtp(digits);
    if (digits.length === 6) {
      setTimeout(() => verifyOtp(), 100);
    }
  };

  const boxes = Array.from({ length: 6 }, (_, i) => otp[i] ?? '');

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
        <Text style={styles.subtitle}>
          {isLogin
            ? `enter the one-time code sent to you.`
            : `verify your invite. enter the one-time code.`}
        </Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxesWrap}>
          {boxes.map((char, i) => (
            <View
              key={i}
              style={[
                styles.box,
                i === otp.length && styles.boxActive,
                error && styles.boxError,
              ]}
            >
              <Text style={styles.boxText}>{char}</Text>
            </View>
          ))}
        </Pressable>

        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenInput}
          autoFocus={false}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <PillButton
          label="verify"
          onPress={verifyOtp}
          variant="yellow"
          disabled={otp.length !== 6 || loading}
          loading={loading}
          style={{ width: '100%', height: 44 }}
        />

        {devCode && <Text style={styles.note}>dev build — your code is {devCode}.</Text>}
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
  boxesWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  box: {
    width: 44,
    height: 52,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.yellow,
    borderWidth: 1.5,
  },
  boxError: {
    borderColor: colors.red,
    borderWidth: 1.5,
  },
  boxText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  error: { color: colors.red, fontSize: 11, marginTop: 4 },
  note: {
    color: colors.textHint,
    fontSize: 9,
    marginTop: 12,
    textAlign: 'center',
  },
});
