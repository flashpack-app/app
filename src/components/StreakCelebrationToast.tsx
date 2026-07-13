import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAccessibility } from '../services/AccessibilityContext';

interface Props {
  days: number;
  visible: boolean;
  onDismiss: () => void;
  onPress: () => void;
}

const AUTO_DISMISS_MS = 2500;
const ANIMATION_DURATION = 400;

export default function StreakCelebrationToast({ days, visible, onDismiss, onPress }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { reduceMotion, minimizeAnimations } = useAccessibility();
  
  const translateY = useSharedValue(-200);

  useEffect(() => {
    if (visible) {
      // Animate in
      if (reduceMotion || minimizeAnimations) {
        translateY.value = withTiming(0, { duration: 200 });
      } else {
        translateY.value = withSequence(
          withTiming(0, { duration: ANIMATION_DURATION }),
          withTiming(0, { duration: AUTO_DISMISS_MS }),
          withTiming(-200, { duration: ANIMATION_DURATION }, (finished) => {
            if (finished) {
              runOnJS(onDismiss)();
            }
          })
        );
      }
    } else {
      // Animate out
      translateY.value = withTiming(-200, { duration: reduceMotion || minimizeAnimations ? 200 : ANIMATION_DURATION });
    }
  }, [visible, reduceMotion, minimizeAnimations, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { top: insets.top + 8 }, animatedStyle]}>
      <Pressable onPress={onPress} style={styles.toast}>
        <View style={styles.iconContainer}>
          <Ionicons name="flame" size={20} color={colors.yellow} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>streak!</Text>
          <Text style={styles.subtitle}>{days} day streak</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFade} />
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,204,0,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,204,0,0.3)',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,204,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.yellow,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '500',
  },
});
