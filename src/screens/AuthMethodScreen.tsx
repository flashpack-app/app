import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashLogo from '../components/FlashLogo';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import * as Haptics from '../services/haptics';

export default function AuthMethodScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const username = route.params?.username as string;
  const inviteCode = route.params?.inviteCode as string;

  const onPhone = () => {
    Haptics.selectionAsync();
    nav.navigate('PhoneNumberScreen', { username, inviteCode });
  };

  const onEmail = () => {
    Haptics.selectionAsync();
    nav.navigate('EmailScreen', { username, inviteCode });
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(12, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <FlashLogo size={36} />
        <Text style={styles.subtitle}>how should we verify you?</Text>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={onPhone}
          activeOpacity={0.75}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.yellow} />
          </View>
          <View style={styles.methodText}>
            <Text style={styles.methodTitle}>continue with phone</Text>
            <Text style={styles.methodSub}>we'll send an SMS code</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textHint} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.methodCard}
          onPress={onEmail}
          activeOpacity={0.75}
        >
          <View style={styles.methodIcon}>
            <Ionicons name="mail-outline" size={22} color={colors.yellow} />
          </View>
          <View style={styles.methodText}>
            <Text style={styles.methodTitle}>continue with email</Text>
            <Text style={styles.methodSub}>we'll send a code to your inbox</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textHint} />
        </TouchableOpacity>

        <Text style={styles.codeFootnote}>
          using <Text style={styles.codeMono}>{inviteCode}</Text>
        </Text>
      </View>
    </View>
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
  methodCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2a2a2a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  methodIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,220,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodText: { flex: 1 },
  methodTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  methodSub: {
    color: colors.textHint,
    fontSize: 11,
    marginTop: 2,
  },
  codeFootnote: { color: colors.textHint, fontSize: 10, marginTop: 18 },
  codeMono: {
    color: colors.textSecondary,
    fontFamily: require('react-native').Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});
