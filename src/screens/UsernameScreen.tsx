import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashLogo from '../components/FlashLogo';
import PillButton from '../components/PillButton';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';

const VALID = /^[a-z0-9_.\-]{2,20}$/;

export default function UsernameScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const code = route.params?.code as string;
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clean = username.trim().toLowerCase();
  const valid = VALID.test(clean);

  const onNext = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      // Navigate to PhoneNumberScreen with username and invite code
      nav.navigate('PhoneNumberScreen', { username: clean, inviteCode: code });
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
            returnKeyType="next"
            onSubmitEditing={onNext}
          />
        </View>
        <Text style={styles.hint}>2–20 chars · a-z, 0-9, _ . -</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <PillButton
          label="next"
          onPress={onNext}
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
