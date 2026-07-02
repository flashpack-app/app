import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScaledText from '../components/ScaledText';
import MatchTicker from '../components/MatchTicker';

// Host nations strip — USA / Mexico / Canada
const HOST_COLORS = ['#B22234', '#006847', '#FF0000'];

function AnimatedProgressBar({
  progress,
  color,
  delay = 0,
}: {
  progress: number; // 0-1
  color: string;
  delay?: number;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(progress * 100, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [progress, delay]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View style={styles2.progressBar}>
      <Animated.View style={[styles2.progressFill, { backgroundColor: color }, style]} />
    </View>
  );
}

function PulsingTrophy({ colors }: { colors: Palette }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[heroStyles.iconGlow, style]}>
      <Ionicons name="football" size={72} color={colors.yellow} />
    </Animated.View>
  );
}

export default function WorldCupScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(12, insets.top) }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </Pressable>
        <ScaledText style={styles.headerTitle}>World Cup Special</ScaledText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <Animated.View entering={FadeIn.duration(500)}>
          <LinearGradient
            colors={['rgba(255,214,10,0.16)', 'rgba(0,0,0,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.hero}
          >
            <PulsingTrophy colors={colors} />
            <ScaledText style={styles.heroTitle}>World Cup 2026</ScaledText>
            <ScaledText style={styles.heroSubtitle}>
              capture the moments that matter with your crew
            </ScaledText>

            <View style={styles.hostStrip}>
              {HOST_COLORS.map((c, i) => (
                <View key={i} style={[styles.hostDash, { backgroundColor: c }]} />
              ))}
            </View>
            <ScaledText style={styles.hostLabel}>USA · MEXICO · CANADA</ScaledText>
          </LinearGradient>
        </Animated.View>

        <MatchTicker />

        {/* How it works */}
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>how it works</ScaledText>

          {[
            {
              icon: 'camera' as const,
              title: 'take photos',
              text: 'snap your daily flash during the World Cup to participate in the special event',
            },
            {
              icon: 'people' as const,
              title: 'match with your crew',
              text: 'get matched with people around the world who are watching the same matches',
            },
            {
              icon: 'trophy' as const,
              title: 'earn rewards',
              text: 'complete special challenges and earn exclusive World Cup badges and streaks',
            },
          ].map((item, i) => (
            <Animated.View
              key={item.title}
              entering={FadeInDown.delay(100 + i * 100).duration(400).springify()}
              style={styles.card}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={item.icon} size={24} color={colors.yellow} />
              </View>
              <ScaledText style={styles.cardTitle}>{item.title}</ScaledText>
              <ScaledText style={styles.cardText}>{item.text}</ScaledText>
            </Animated.View>
          ))}
        </View>

        {/* Challenges */}
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>special challenges</ScaledText>

          <Animated.View
            entering={FadeInDown.delay(150).duration(400).springify()}
            style={styles.challenge}
          >
            <View style={styles.challengeHeader}>
              <Ionicons name="flame" size={20} color={colors.red} />
              <ScaledText style={styles.challengeTitle}>match day streak</ScaledText>
            </View>
            <ScaledText style={styles.challengeText}>
              maintain your streak during every match day to unlock the "Ultimate Fan" badge
            </ScaledText>
            <AnimatedProgressBar progress={0.65} color={colors.yellow} delay={300} />
            <ScaledText style={styles.progressText}>6/10 match days completed</ScaledText>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(250).duration(400).springify()}
            style={styles.challenge}
          >
            <View style={styles.challengeHeader}>
              <Ionicons name="earth" size={20} color={colors.green} />
              <ScaledText style={styles.challengeTitle}>global supporter</ScaledText>
            </View>
            <ScaledText style={styles.challengeText}>
              flash with people from 10+ different countries during the tournament
            </ScaledText>
            <AnimatedProgressBar progress={0.4} color={colors.green} delay={400} />
            <ScaledText style={styles.progressText}>4/10 countries reached</ScaledText>
          </Animated.View>
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>leaderboard</ScaledText>

          {[
            { rank: 1, name: '@soccercrazy', score: '12,450 pts', medal: colors.yellow, hot: true },
            { rank: 2, name: '@goalgetter', score: '11,200 pts', medal: colors.textDim, hot: false },
            { rank: 3, name: '@pitchperfect', score: '10,890 pts', medal: colors.amber, hot: false },
          ].map((item, i) => (
            <Animated.View
              key={item.rank}
              entering={FadeInDown.delay(200 + i * 100).duration(400).springify()}
              style={[styles.leaderboardItem, item.hot && styles.leaderboardItemTop]}
            >
              <ScaledText
                style={[styles.rank, item.hot && { backgroundColor: 'rgba(255,214,10,0.22)' }]}
              >
                {item.rank}
              </ScaledText>
              <View style={styles.leaderboardInfo}>
                <ScaledText style={styles.username}>{item.name}</ScaledText>
                <ScaledText style={styles.score}>{item.score}</ScaledText>
              </View>
              <Ionicons name="medal" size={20} color={item.medal} />
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// static style used inside the standalone progress bar component
const styles2 = StyleSheet.create({
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

const heroStyles = StyleSheet.create({
  iconGlow: {
    marginBottom: 4,
  },
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: colors.black },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '700',
    },
    placeholder: { width: 40 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    hero: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 20,
      gap: 8,
    },
    heroTitle: {
      color: colors.yellow,
      fontSize: 30,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    heroSubtitle: {
      color: colors.textDim,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 8,
    },
    hostStrip: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },
    hostDash: {
      width: 28,
      height: 4,
      borderRadius: 2,
    },
    hostLabel: {
      color: colors.textFade,
      fontSize: 10,
      letterSpacing: 1.5,
      marginTop: 6,
    },
    section: {
      paddingHorizontal: 16,
      marginTop: 24,
    },
    sectionTitle: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
    },
    card: {
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    cardIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,214,10,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 4,
    },
    cardText: {
      color: colors.textDim,
      fontSize: 13,
      lineHeight: 18,
    },
    challenge: {
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    challengeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    challengeTitle: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '700',
    },
    challengeText: {
      color: colors.textDim,
      fontSize: 12,
      lineHeight: 16,
      marginBottom: 12,
    },
    progressText: {
      color: colors.textFade,
      fontSize: 11,
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    leaderboardItemTop: {
      borderColor: 'rgba(255,214,10,0.3)',
      backgroundColor: 'rgba(255,214,10,0.05)',
    },
    rank: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,214,10,0.12)',
      color: colors.yellow,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 28,
      marginRight: 12,
    },
    leaderboardInfo: {
      flex: 1,
      gap: 2,
    },
    username: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '600',
    },
    score: {
      color: colors.textDim,
      fontSize: 12,
    },
  });
