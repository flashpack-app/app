// src/components/MatchTicker.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import ScaledText from './ScaledText';
import { useWorldCupMatches } from '../hooks/useWorldCupMatches';
import type { Fixture } from '../services/footballApi';

const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'];

function LiveDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 600 }), withTiming(1, { duration: 600 })),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[dotStyles.dot, style]} />;
}

function MatchCard({ fixture, colors }: { fixture: Fixture; colors: Palette }) {
  const isLive = LIVE_STATUSES.includes(fixture.fixture.status.short);
  const isFinished = ['FT', 'AET', 'PEN'].includes(fixture.fixture.status.short);

  return (
    <View style={cardStyles(colors).card}>
      <View style={cardStyles(colors).statusRow}>
        {isLive ? (
          <View style={cardStyles(colors).liveBadge}>
            <LiveDot />
            <ScaledText style={cardStyles(colors).liveText}>
              {fixture.fixture.status.elapsed ?? 0}'
            </ScaledText>
          </View>
        ) : (
          <ScaledText style={cardStyles(colors).statusText}>
            {isFinished
              ? 'FT'
              : new Date(fixture.fixture.date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
          </ScaledText>
        )}
      </View>

      <View style={cardStyles(colors).teamRow}>
        <ScaledText style={cardStyles(colors).teamName} numberOfLines={1}>
          {fixture.teams.home.name}
        </ScaledText>
        <ScaledText style={cardStyles(colors).score}>
          {fixture.goals.home ?? '–'}
        </ScaledText>
      </View>
      <View style={cardStyles(colors).teamRow}>
        <ScaledText style={cardStyles(colors).teamName} numberOfLines={1}>
          {fixture.teams.away.name}
        </ScaledText>
        <ScaledText style={cardStyles(colors).score}>
          {fixture.goals.away ?? '–'}
        </ScaledText>
      </View>
    </View>
  );
}

export default function MatchTicker() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { fixtures, loading, error, hasLive } = useWorldCupMatches();

  if (loading) {
    return (
      <View style={styles.wrap}>
        <ScaledText style={styles.placeholderText}>loading matches…</ScaledText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.wrap}>
        <ScaledText style={styles.placeholderText}>couldn't load matches</ScaledText>
      </View>
    );
  }

  if (fixtures.length === 0) {
    return (
      <View style={styles.wrap}>
        <ScaledText style={styles.placeholderText}>no matches today</ScaledText>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ScaledText style={styles.title}>
          {hasLive ? 'live now' : "today's matches"}
        </ScaledText>
        {hasLive && <LiveDot />}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {fixtures.map((f) => (
          <MatchCard key={f.fixture.id} fixture={f} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

const dotStyles = StyleSheet.create({
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { marginTop: 8, marginBottom: 4 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    title: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    row: { paddingHorizontal: 16, gap: 10 },
    placeholderText: {
      color: colors.textFade,
      fontSize: 12,
      paddingHorizontal: 16,
    },
  });

const cardStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      width: 140,
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    statusRow: { marginBottom: 8 },
    statusText: {
      color: colors.textFade,
      fontSize: 11,
      fontWeight: '600',
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    liveText: {
      color: '#FF3B30',
      fontSize: 11,
      fontWeight: '700',
    },
    teamRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    teamName: {
      color: colors.white,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    score: {
      color: colors.yellow,
      fontSize: 14,
      fontWeight: '800',
      marginLeft: 6,
    },
  });
