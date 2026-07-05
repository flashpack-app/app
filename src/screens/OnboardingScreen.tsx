import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  Image,
  ViewToken,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '../services/haptics';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';

const { width: SCREEN_W } = Dimensions.get('window');
const LOGO = require('../assets/logo-white.png');

interface OnboardingStep {
  id: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'real moments,\nreal people.',
    body: 'no followers. no likes. just you and three others sharing one photo a day.',
  },
  {
    id: 'packs',
    icon: 'people-outline',
    title: 'meet your\npack.',
    body: "each day you're matched with three people. post your moment, then everyone's photos unlock at once.",
  },
  {
    id: 'camera',
    icon: 'camera-outline',
    title: 'snap your\nflash.',
    body: 'one tap, one photo. add a filter if you want — just keep it real.',
  },
  {
    id: 'community',
    icon: 'flame-outline',
    title: 'build your\nstreak.',
    body: 'post daily to keep your streak alive. react to packs and discover moments from around the world.',
  },
  {
    id: 'invite',
    title: 'invite your\nfriends.',
    body: 'flash. grows by invite only. copy your invite link to bring in your crew.',
  },
  {
    id: 'go',
    icon: 'sparkles-outline',
    title: "you're\nready.",
    body: 'your first pack is waiting. snap a photo to meet your crew.',
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Welcome step visual — logo, flag, a personal greeting, and the
// "you joined from ..." line. No pills here (those moved to other
// steps), no extra entrance animation — the carousel's own
// scroll-linked animation already handles motion.
function WelcomeVisual() {
  const styles = useThemedStyles(makeStyles);
  const { user } = useAppState();
  const flag = user?.flag ?? '🌍';
  const city = (user?.city ?? 'unknown').toLowerCase();
  const country = user?.country ?? '';
  const username = user?.username ?? '';

  const scale = useSharedValue(0.3);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 140, mass: 0.7 });

    rotate.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(5, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const flagStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <View style={styles.welcomeVisual}>
      <View style={styles.iconCircle}>
        <Animated.Text style={[styles.flagLarge, flagStyle]}>{flag}</Animated.Text>
      </View>

      {username ? (
        <Text style={styles.greeting}>
          welcome, <Text style={styles.greetingHighlight}>@{username}</Text>
        </Text>
      ) : null}

      <Text style={styles.locationLine}>
        you joined from{' '}
        <Text style={styles.locationHighlight}>
          {city}
          {country ? `, ${country.toLowerCase()}` : ''}
        </Text>
      </Text>
    </View>
  );
}

function InviteVisual() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const { user } = useAppState();
  const code = user?.inviteCode ?? 'FLASH-INVITE';
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const msg = `join me on flash. — https://flsh.pl/${code}`;
    await Clipboard.setStringAsync(msg);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.inviteVisual}>
      <View style={styles.inviteCard}>
        <Text style={styles.inviteCode}>{code}</Text>
        <Pressable
          onPress={onCopy}
          style={({ pressed }) => [
            styles.inviteCopyBtn,
            pressed && { opacity: 0.7 },
            copied && { backgroundColor: 'rgba(46, 204, 113, 0.15)' },
          ]}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={18}
            color={copied ? colors.green : colors.yellow}
          />
        </Pressable>
      </View>
      {copied && (
        <View style={styles.copiedBadge}>
          <Text style={styles.copiedText}>invite message copied!</Text>
        </View>
      )}
    </View>
  );
}

function StepPage({
  step,
  index,
  scrollX,
}: {
  step: OnboardingStep;
  index: number;
  scrollX: SharedValue<number>;
}) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const isWelcome = step.id === 'welcome';
  const isInvite = step.id === 'invite';

  const visualStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * SCREEN_W;
    const opacity = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [16, 0, 16], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const textStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * SCREEN_W;
    const opacity = interpolate(offset, [-SCREEN_W * 0.6, 0, SCREEN_W * 0.6], [0, 1, 0], Extrapolation.CLAMP);
    const translateX = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [-24, 0, 24], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateX }] };
  });

  return (
    <View style={[styles.page, { width: SCREEN_W }]}>
      <Animated.View style={[isWelcome ? styles.welcomeVisualWrap : isInvite ? styles.inviteVisualWrap : styles.visual, visualStyle]}>
        {isWelcome ? (
          <WelcomeVisual />
        ) : isInvite ? (
          <InviteVisual />
        ) : (
          step.icon && (
            <View style={styles.iconCircle}>
              <Ionicons name={step.icon} size={38} color={colors.yellow} />
            </View>
          )
        )}
      </Animated.View>

      <Animated.View style={[styles.textBlock, textStyle]}>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = currentIndex === STEPS.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      nav.replace('OnboardingPro');
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex, isLast, nav]);

  const onSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nav.replace('OnboardingPro');
  }, [nav]);

  const btnScale = useSharedValue(1);
  const onPressIn = () => { btnScale.value = withSpring(0.96); };
  const onPressOut = () => { btnScale.value = withSpring(1); };
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const renderItem = useCallback(
    ({ item, index: i }: { item: OnboardingStep; index: number }) => (
      <StepPage step={item} index={i} scrollX={scrollX} />
    ),
    [scrollX],
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(16, insets.top) }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
        <Image source={LOGO} style={styles.headerLogo} resizeMode="contain" />

        {!isLast ? (
          <Pressable onPress={onSkip} hitSlop={12}>
            <Text style={styles.skipText}>skip</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </Animated.View>

      {/* Pages */}
      <Animated.FlatList
        ref={flatListRef}
        data={STEPS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Bottom */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(400)}
        style={[styles.bottom, { paddingBottom: Math.max(28, insets.bottom) }]}
      >
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        <AnimatedPressable
          onPress={goNext}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[styles.cta, btnAnimStyle]}
        >
          <Text style={styles.ctaText}>{isLast ? "let's go" : 'next'}</Text>
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const colors = useColors();
  const dotStyle = useAnimatedStyle(() => {
    const offset = Math.abs(scrollX.value / SCREEN_W - index);
    const width = interpolate(offset, [0, 1], [18, 6], Extrapolation.CLAMP);
    const opacity = interpolate(offset, [0, 1], [1, 0.25], Extrapolation.CLAMP);
    return { width, opacity };
  });

  return (
    <Animated.View
      style={[{ height: 6, borderRadius: 3, backgroundColor: colors.yellow }, dotStyle]}
    />
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    height: 32,
  },
  headerLogo: {
    width: 64,
    height: 20,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  visual: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  // Welcome step gets its own wrapper since it holds more content
  // (logo + flag circle + greeting + location line) than the icon-only steps.
  welcomeVisualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  welcomeVisual: {
    alignItems: 'center',
    gap: 16,
  },
  inviteVisualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    width: '100%',
  },
  inviteVisual: {
    alignItems: 'center',
    gap: 12,
    width: SCREEN_W - 72,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  inviteCode: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 2,
  },
  inviteCopyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  copiedText: {
    color: colors.green,
    fontSize: 12,
    fontWeight: '600',
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: 'rgba(255,214,10,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,10,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagLarge: {
    fontSize: 52,
  },
  greeting: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  greetingHighlight: {
    color: colors.yellow,
    fontWeight: '800',
  },
  locationLine: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  locationHighlight: {
    color: colors.yellow,
    fontWeight: '700',
  },
  textBlock: {
    alignItems: 'center',
    gap: 14,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 37,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.yellow,
  },
  ctaText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});