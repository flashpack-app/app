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

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  pack: 'cube-outline',
  comment: 'chatbubble-outline',
  reaction: 'happy-outline',
  streak: 'flame-outline',
  system: 'megaphone-outline',
  invite: 'person-add-outline',
  screenshot: 'warning-outline',
};

const makeTypeColor = (colors: Palette): Record<string, string> => ({
  pack: colors.green,
  comment: colors.yellow,
  reaction: colors.yellow,
  streak: colors.red,
  system: colors.yellow,
  invite: colors.yellow,
  screenshot: colors.red,
});

interface Props {
  visible: boolean;
  title: string;
  body?: string;
  type?: string;
  packId?: string;
  onDismiss: () => void;
  onPress: () => void;
}

const AUTO_DISMISS_MS = 3500;
const ANIMATION_DURATION = 400;

export default function LiveNotificationToast({
  visible,
  title,
  body,
  type = 'system',
  packId,
  onDismiss,
  onPress,
}: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const typeColor = makeTypeColor(colors);

  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Animate in
      translateY.value = withTiming(0, { duration: ANIMATION_DURATION });
      opacity.value = withTiming(1, { duration: ANIMATION_DURATION });

      // Auto dismiss
      const timer = setTimeout(() => {
        translateY.value = withTiming(-200, { duration: ANIMATION_DURATION });
        opacity.value = withTiming(0, { duration: ANIMATION_DURATION }, (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        });
      }, AUTO_DISMISS_MS);

      return () => clearTimeout(timer);
    } else {
      // Animate out immediately
      translateY.value = -200;
      opacity.value = 0;
    }
  }, [visible, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const icon = typeIcon[type] ?? 'notifications-outline';
  const color = typeColor[type] ?? colors.yellow;

  return (
    <Animated.View style={[styles.container, { top: insets.top + 8 }, animatedStyle]}>
      <Pressable onPress={onPress} style={styles.toast}>
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {body && <Text style={styles.body} numberOfLines={2}>{body}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFade} />
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
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
