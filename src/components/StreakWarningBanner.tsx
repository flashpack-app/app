import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';

interface Props {
  /** Optional override for the streak days if you want to show a specific number */
  streakDays?: number;
}

const StreakWarningBanner: React.FC<Props> = ({ streakDays }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const { streak, streakAtRisk } = useAppState();

  // Use provided streakDays or fall back to streak from state
  const days = streakDays ?? streak?.streakDays ?? 0;

  // Don't render if not at risk or no streak
  if (!streakAtRisk || days < 1) {
    return null;
  }

  const onPress = () => {
    nav.navigate('Camera');
  };

  return (
    <Pressable onPress={onPress} style={styles.banner}>
      <View style={styles.iconContainer}>
        <Ionicons name="flame" size={16} color={colors.red} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>streak at risk</Text>
        <Text style={styles.subtitle}>
          flash today to keep your {days} day streak
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFade} />
    </Pressable>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,69,58,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.3)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,69,58,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 12,
  },
});

export default StreakWarningBanner;
