import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';

interface Props {
  visible: boolean;
}

export default function CaptureBlockedOverlay({ visible }: Props) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Ionicons name="phone-portrait-outline" size={64} color={colors.white} style={styles.iconWithSlash} />
      <View style={styles.slashLine} />
      <Text style={styles.title}>You can't screenshot or record this</Text>
      <Text style={styles.subtitle}>It's only meant to be viewed in the app. However, you can post this on your social media platforms.</Text>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    zIndex: 1000,
  },
  iconWithSlash: {
    marginBottom: 24,
  },
  slashLine: {
    position: 'absolute',
    width: 80,
    height: 4,
    backgroundColor: colors.red,
    transform: [{ rotate: '45deg' }],
    top: '50%',
    marginTop: -32,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});
