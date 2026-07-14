import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TouchableOpacity,
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
import { posthog } from '../config/posthog';
import { t } from '../services/i18n';

export default function OTPScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { signIn } = useAppState();

  const username = route.params?.username as string | undefined;
  const inviteCode = route.params?.inviteCode as string | undefined;
  const phone = route.params?.phone as string | undefined;
  const extras = route.params?.extras as { city?: string; country?: string; flag?: string } | undefined;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const isLogin = !!username;
  const isSignup = !!inviteCode;

  useEffect(() => {
    // auto-focus hidden input
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    // Request a code for this subject as soon as the screen opens.
    console.log('[OTPScreen] Requesting OTP with:', { username, inviteCode, phone });
    APIService.sendOTP({ username, inviteCode, phone })
      .then((res) => {
        console.log('[OTPScreen] OTP send response:', res);
        if (res.devCode) setDevCode(res.devCode);
        // Start 60-second cooldown after successful send
        setResendCooldown(60);
      })
      .catch((e: any) => {
        console.error('[OTPScreen] OTP send error:', e);
        setError(e?.body?.error === 'rate_limited'
          ? t('otp_error_rateLimited')
          : t('otp_error_sendFailed'));
      });
  }, [username, inviteCode, phone]);

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await APIService.sendOTP({ username, inviteCode, phone });
      if (res.devCode) setDevCode(res.devCode);
      setResendCooldown(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e?.body?.error === 'rate_limited'
        ? t('otp_error_rateLimited')
        : t('otp_error_sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);

    try {
      const { user, token } = await APIService.verifyOTP({ username, inviteCode, code: otp, phone, ...extras });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (user && token) {
        posthog.identify(user.id, {
          $set: { username: user.username, is_pro: user.isPro, country: user.country, city: user.city },
          $set_once: { joined_at: user.joinedAt, ...(user.invitedBy ? { invited_by: user.invitedBy } : {}) },
        });
        if (isSignup) {
          posthog.capture('signup_completed', { username: user.username, country: user.country });
        } else {
          posthog.capture('login_completed', { username: user.username });
        }
        await signIn({ user, token });
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const reason = e?.body?.error ?? '';
      setError(
        reason === 'expired' ? t('otp_error_expired')
        : reason === 'too_many_attempts' ? t('otp_error_tooManyAttempts')
        : reason === 'not_found' ? t('otp_error_notFound')
        : reason === 'username_taken' ? t('otp_error_usernameTaken')
        : t('otp_error_invalid'),
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
            ? t('otp_subtitle_login')
            : t('otp_subtitle_signup')}
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
          label={t('otp_verify')}
          onPress={verifyOtp}
          variant="yellow"
          disabled={otp.length !== 6 || loading}
          loading={loading}
          style={{ width: '100%', height: 44 }}
        />

        <TouchableOpacity
          onPress={resendCode}
          disabled={resendCooldown > 0 || loading}
          style={styles.resendButton}
        >
          <Text style={[styles.resendText, resendCooldown > 0 && styles.resendTextDisabled]}>
            {resendCooldown > 0 ? t('otp_resendIn', { count: resendCooldown }) : t('otp_resendCode')}
          </Text>
        </TouchableOpacity>

        {devCode && <Text style={styles.note}>{t('otp_devCode', { code: devCode })}</Text>}
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
  resendButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  resendText: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: colors.textHint,
  },
});
