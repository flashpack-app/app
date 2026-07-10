import React, { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FlashLogo from '../components/FlashLogo';
import ScaledText from '../components/ScaledText';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';

type Props = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onForYouPress: () => void;
  onProfilePress: () => void;
  onSettingsPress: () => void;
  children: React.ReactNode;
  expiryCountdown?: string;
  onExpiryPress?: () => void;
};

const TIMING = { duration: 220 };

export default function LeftMenu({
  isOpen,
  onOpenChange,
  onForYouPress,
  onProfilePress,
  onSettingsPress,
  children,
  expiryCountdown,
  onExpiryPress,
}: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.76, 310);
  const progress = useSharedValue(isOpen ? 1 : 0);
  const startProgress = useSharedValue(isOpen ? 1 : 0);

  // Determine color based on countdown
  const getExpiryColor = () => {
    if (!expiryCountdown) return colors.red;
    // Parse hours from format like "16h 30m" or "45m"
    const hoursMatch = expiryCountdown.match(/(\d+)h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    if (hours < 1) return '#4ade80'; // green
    if (hours <= 10) return '#f97316'; // orange
    return colors.red;
  };

  const getExpiryText = () => {
    if (!expiryCountdown) return '';
    const hoursMatch = expiryCountdown.match(/(\d+)h/);
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    if (hours < 1) return 'get ready';
    return `${expiryCountdown} left for your next flash.`;
  };

  useEffect(() => {
    progress.value = withTiming(isOpen ? 1 : 0, TIMING);
  }, [isOpen, progress]);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-18, 18])
    .onStart(() => {
      startProgress.value = progress.value;
    })
    .onUpdate((event) => {
      const next = startProgress.value + event.translationX / drawerWidth;
      progress.value = Math.min(1, Math.max(0, next));
    })
    .onEnd((event) => {
      let nextOpen = progress.value > 0.48;
      if (event.velocityX > 520) {
        nextOpen = true;
      }
      if (event.velocityX < -520) {
        nextOpen = false;
      }
      progress.value = withTiming(nextOpen ? 1 : 0, TIMING);
      runOnJS(onOpenChange)(nextOpen);
    });

  const drawerStyle = useAnimatedStyle(() => ({
    width: drawerWidth,
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-drawerWidth, 0], Extrapolation.CLAMP) }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [0, drawerWidth], Extrapolation.CLAMP) }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, colors.name === 'light' ? 0.22 : 0.48], Extrapolation.CLAMP),
  }));

  const handleForYou = () => {
    onForYouPress();
    onOpenChange(false);
  };

  const handleProfile = () => {
    onProfilePress();
    onOpenChange(false);
  };

  const handleSettings = () => {
    onSettingsPress();
    onOpenChange(false);
  };

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.drawer,
          drawerStyle,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 18),
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <FlashLogo size={24} />
          <Pressable onPress={() => onOpenChange(false)} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="menu-outline" size={28} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable onPress={handleProfile} style={styles.profileButton}>
          <Ionicons name="person-outline" size={24} color={colors.white} />
          <ScaledText style={styles.profileButtonText}>Profile</ScaledText>
        </Pressable>

        {expiryCountdown && (
          <Pressable onPress={onExpiryPress} style={[styles.expiryBanner, { backgroundColor: getExpiryColor() + '22', borderColor: getExpiryColor() }]}>
            <Ionicons name="time-outline" size={14} color={getExpiryColor()} />
            <ScaledText style={[styles.expiryBannerText, { color: getExpiryColor() }]}>{getExpiryText()}</ScaledText>
          </Pressable>
        )}

        <View style={styles.menuCard}>
          <Pressable onPress={handleForYou} style={styles.menuRow}>
            <View>
              <ScaledText style={styles.menuTitle}>For you</ScaledText>
              <ScaledText style={styles.menuSub}>Around the globe</ScaledText>
            </View>
            <Ionicons name="earth-outline" size={24} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.spacer} />

        <Pressable onPress={handleSettings} style={styles.settingsRow}>
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          <ScaledText style={styles.settingsText}>Settings</ScaledText>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.content, contentStyle]}>
          {children}
          {isOpen ? (
            <Pressable onPress={() => onOpenChange(false)} style={StyleSheet.absoluteFill} />
          ) : null}
          <Animated.View pointerEvents="none" style={[styles.scrim, overlayStyle]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    backgroundColor: colors.black,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    paddingHorizontal: 16,
  },
  drawerHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    height: 50,
    marginTop: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  expiryBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuCard: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSofter,
  },
  menuRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  menuSub: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'lowercase',
  },
  spacer: {
    flex: 1,
  },
  settingsRow: {
    minHeight: 52,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  settingsText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    zIndex: 2,
    backgroundColor: colors.black,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
});
