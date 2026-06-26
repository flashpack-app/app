import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

type Variant = 'yellow' | 'dim' | 'red' | 'white' | 'ghost';

interface Props {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

const PillButton: React.FC<Props> = ({
  label,
  onPress,
  variant = 'yellow',
  disabled,
  loading,
  style,
  textStyle,
  children,
}) => {
  const v = variants[variant];
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        v.container,
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text.color as string} />
      ) : (
        <>
          {children}
          {label ? <Text style={[styles.text, v.text, textStyle]}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: { fontSize: 13, fontWeight: '700' },
});

const variants: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  yellow: {
    container: { backgroundColor: colors.yellow },
    text: { color: '#000' },
  },
  dim: {
    container: {
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    text: { color: colors.white },
  },
  red: {
    container: { backgroundColor: colors.red },
    text: { color: colors.white },
  },
  white: {
    container: { backgroundColor: colors.white },
    text: { color: '#000' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.white },
  },
};

export default PillButton;
