import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import FlashLogo from '../components/FlashLogo';

export default function WelcomeLocationScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAppState();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(15);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    translateY.value = withTiming(0, { duration: 600 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const city = user?.city ?? 'unknown';
  const country = user?.country ?? '';
  const name = user?.username ?? '';

  const onNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    nav.replace('OnboardingPro');
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.inner, animatedStyle, { paddingTop: Math.max(24, insets.top), paddingBottom: Math.max(32, insets.bottom) }]}>
        
        {/* Header Logo */}
        <View style={styles.logoRow}>
          <FlashLogo size={20} />
        </View>

        <View style={styles.centerContent}>
          {/* Location Icon instead of Emojis */}
          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={44} color={colors.yellow} />
          </View>

          {/* Clean minimal greeting */}
          <Text style={styles.welcomeTag}>welcome to flash</Text>
          
          <Text style={styles.locationLine}>
            you joined from{' '}
            <Text style={styles.locationHighlight}>
              {city.toLowerCase()}, {country}
            </Text>
          </Text>

          {/* Chips using Ionicons instead of Emojis */}
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Ionicons name="flash-outline" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.chipText}>instant packs</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="globe-outline" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.chipText}>global community</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="flame-outline" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.chipText}>daily streaks</Text>
            </View>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottom}>
          <Text style={styles.greetingName}>hey @{name} 👋</Text>
          <Text style={styles.greetingText}>
            you're officially in. snap your first flash to meet your pack.
          </Text>
          <Pressable
            onPress={onNext}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.btnText}>continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  logoRow: {
    alignItems: 'center',
    paddingTop: 8,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,214,10,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeTag: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  locationLine: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  locationHighlight: {
    color: colors.yellow,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  greetingName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  greetingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.yellow,
  },
  btnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});
