import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { Palette } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  reactions: { emoji: string; userId: string }[];
  maxBubbles?: number;
  onPress?: () => void;
}

const ReactionStack: React.FC<Props> = ({ reactions, maxBubbles = 3, onPress }) => {
  const styles = useThemedStyles(makeStyles);
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reactions) {
      map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [reactions]);

  if (grouped.length === 0) return null;

  const visible = grouped.slice(0, maxBubbles);
  const overflow = grouped.length - maxBubbles;
  const total = reactions.length;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.bubbles}>
        {visible.map(([emoji], i) => (
          <View
            key={emoji}
            style={[
              styles.bubble,
              i > 0 && styles.bubbleOverlap,
            ]}
          >
            <Text style={{ fontSize: 13 }}>{emoji}</Text>
          </View>
        ))}
        {overflow > 0 && (
          <View style={[styles.bubble, styles.bubbleOverlap, styles.countBubble]}>
            <Text style={styles.countText}>+{overflow}</Text>
          </View>
        )}
      </View>
      {total > 0 && (
        <Text style={styles.countLabel}>{total}</Text>
      )}
    </Pressable>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubbles: { flexDirection: 'row', alignItems: 'center' },
  bubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.overlay(0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleOverlap: { marginLeft: -6 },
  countBubble: {
    backgroundColor: colors.overlay(0.1),
    borderColor: colors.overlay(0.15),
  },
  countText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  countLabel: { color: colors.textFade, fontSize: 10, fontWeight: '600' },
});

export default ReactionStack;
