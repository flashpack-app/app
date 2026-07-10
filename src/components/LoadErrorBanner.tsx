import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../theme/useColors';

interface Props {
  /** Whether the last load for this surface failed. */
  visible: boolean;
  /** Re-runs the relevant refresh; clears the banner on success. */
  onRetry: () => void;
  message?: string;
}

/**
 * Inline error + "tap to retry" affordance shown when a data load fails, so a
 * transient network/server hiccup reads as recoverable instead of an empty app.
 * Retry reuses the screen's existing refresh function; a successful reload
 * clears the error flag in AppState, which hides this banner.
 */
export default function LoadErrorBanner({ visible, onRetry, message }: Props) {
  const colors = useColors();
  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: 'rgba(255,69,58,0.10)', borderColor: 'rgba(255,69,58,0.35)' },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={colors.red} style={styles.icon} />
      <Text style={[styles.text, { color: colors.white }]} numberOfLines={2}>
        {message ?? "couldn't load. check your connection."}
      </Text>
      <Pressable
        onPress={onRetry}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="retry loading"
        style={({ pressed }) => [
          styles.retry,
          { borderColor: colors.red, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Ionicons name="refresh" size={13} color={colors.red} />
        <Text style={[styles.retryText, { color: colors.red }]}>retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: { opacity: 0.9 },
  text: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  retryText: { fontSize: 12, fontWeight: '700' },
});
