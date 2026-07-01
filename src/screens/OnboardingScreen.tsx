import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import FlashLogo from '../components/FlashLogo';

const { width: SCREEN_W } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tag: string;
  title: string;
  body: string;
  features?: { icon: keyof typeof Ionicons.glyphMap; label: string }[];
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    icon: 'flash',
    iconColor: '#FFD60A',
    tag: 'welcome to flash',
    title: 'real moments,\nreal people.',
    body: 'no followers. no likes. just you and 3 others sharing one photo a day.',
  },
  {
    id: 'packs',
    icon: 'people',
    iconColor: '#0A84FF',
    tag: 'how it works',
    title: 'meet your\npack.',
    body: "every day you're matched with 3 people. post your moment, then everyone's photos unlock at once.",
    features: [
      { icon: 'grid-outline', label: '4-person mosaic' },
      { icon: 'lock-closed-outline', label: 'locked until all post' },
      { icon: 'shuffle-outline', label: 'new pack daily' },
    ],
  },
  {
    id: 'camera',
    icon: 'camera',
    iconColor: '#30D158',
    tag: 'capture',
    title: 'snap your\nflash.',
    body: 'one tap. one photo. add a filter if you want — keep it real. pro users can capture 1.5s video bursts.',
    features: [
      { icon: 'color-filter-outline', label: '6 film filters' },
      { icon: 'videocam-outline', label: 'flash.live video' },
      { icon: 'arrow-undo-outline', label: 'revert window' },
    ],
  },
  {
    id: 'community',
    icon: 'flame',
    iconColor: '#FF9F0A',
    tag: 'stay connected',
    title: 'streaks &\ncommunity.',
    body: 'post daily to build your streak. react to packs, comment when everyone has posted, and discover packs worldwide.',
    features: [
      { icon: 'flame-outline', label: 'daily streaks' },
      { icon: 'chatbubble-outline', label: 'pack comments' },
      { icon: 'compass-outline', label: 'discover feed' },
    ],
  },
  {
    id: 'go',
    icon: 'rocket',
    iconColor: '#BF5AF2',
    tag: "you're ready",
    title: "let's\nflash.",
    body: 'your first pack is waiting. snap a photo to meet your crew.',
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const iconStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * SCREEN_W;
    const scale = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [0.6, 1, 0.6], Extrapolation.CLAMP);
    const opacity = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [30, 0, 30], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }], opacity };
  });

  const textStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * SCREEN_W;
    const opacity = interpolate(offset, [-SCREEN_W * 0.5, 0, SCREEN_W * 0.5], [0, 1, 0], Extrapolation.CLAMP);
    const translateX = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [-40, 0, 40], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateX }] };
  });

  const featuresStyle = useAnimatedStyle(() => {
    const offset = scrollX.value - index * SCREEN_W;
    const opacity = interpolate(offset, [-SCREEN_W * 0.4, 0, SCREEN_W * 0.4], [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(offset, [-SCREEN_W, 0, SCREEN_W], [20, 0, 20], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  return (
    <View style={[styles.page, { width: SCREEN_W }]}>
      <View style={styles.pageContent}>
        {/* Icon */}
        <Animated.View style={[styles.iconCircle, { borderColor: step.iconColor + '30' }, iconStyle]}>
          <View style={[styles.iconInner, { backgroundColor: step.iconColor + '15' }]}>
            <Ionicons name={step.icon} size={36} color={step.iconColor} />
          </View>
        </Animated.View>

        {/* Tag */}
        <Animated.View style={textStyle}>
          <Text style={[styles.tag, { color: step.iconColor }]}>{step.tag}</Text>
        </Animated.View>

        {/* Title */}
        <Animated.View style={textStyle}>
          <Text style={styles.title}>{step.title}</Text>
        </Animated.View>

        {/* Body */}
        <Animated.View style={textStyle}>
          <Text style={styles.body}>{step.body}</Text>
        </Animated.View>

        {/* Feature chips */}
        {step.features && (
          <Animated.View style={[styles.featureRow, featuresStyle]}>
            {step.features.map((f) => (
              <View key={f.label} style={styles.featureChip}>
                <Ionicons name={f.icon} size={13} color={colors.textSecondary} />
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAppState();

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

  // Animated styles for bottom section
  const btnScale = useSharedValue(1);
  const onPressIn = () => { btnScale.value = withSpring(0.95); };
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
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <FlashLogo size={18} />
        {!isLast && (
          <Pressable onPress={onSkip} hitSlop={12}>
            <Text style={styles.skipText}>skip</Text>
          </Pressable>
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
        entering={FadeInUp.delay(300).duration(500)}
        style={[styles.bottom, { paddingBottom: Math.max(28, insets.bottom) }]}
      >
        {/* Greeting (only on first slide) */}
        {currentIndex === 0 && user?.username && (
          <Animated.Text entering={FadeInDown.duration(400)} style={styles.greeting}>
            hey @{user.username}
          </Animated.Text>
        )}

        {/* Progress dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <DotIndicator key={i} index={i} currentIndex={currentIndex} color={STEPS[currentIndex]?.iconColor ?? colors.yellow} />
          ))}
        </View>

        {/* CTA button */}
        <AnimatedPressable
          onPress={goNext}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[styles.cta, btnAnimStyle]}
        >
          <Text style={styles.ctaText}>{isLast ? "let's go" : 'next'}</Text>
          <Ionicons name={isLast ? 'flash' : 'arrow-forward'} size={16} color="#000" />
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

function DotIndicator({ index, currentIndex, color }: { index: number; currentIndex: number; color: string }) {
  const active = index === currentIndex;
  const widthVal = useSharedValue(active ? 20 : 6);
  const opacityVal = useSharedValue(active ? 1 : 0.25);
  const colorVal = active ? color : 'rgba(255,255,255,0.25)';

  React.useEffect(() => {
    widthVal.value = withSpring(active ? 20 : 6, { damping: 15, stiffness: 200 });
    opacityVal.value = withTiming(active ? 1 : 0.25, { duration: 250 });
  }, [active]);

  const dotStyle = useAnimatedStyle(() => ({
    width: widthVal.value,
    opacity: opacityVal.value,
  }));

  return (
    <Animated.View
      style={[
        {
          height: 6,
          borderRadius: 3,
          backgroundColor: colorVal,
        },
        dotStyle,
      ]}
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
    paddingVertical: 12,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pageContent: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 38,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
    maxWidth: 320,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSoft,
  },
  featureLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '500',
  },
  bottom: {
    paddingHorizontal: 24,
    gap: 16,
    alignItems: 'center',
  },
  greeting: {
    color: colors.textHint,
    fontSize: 13,
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.yellow,
  },
  ctaText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
