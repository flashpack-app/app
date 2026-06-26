import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { useAccessibility } from '../services/AccessibilityContext';
import { useColors } from '../theme/useColors';
import { colors as staticColors } from '../theme/colors';

interface Props extends TextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
}

function scaleStyle(s: TextStyle | TextStyle[] | undefined, scale: number): any {
  const flat = StyleSheet.flatten(s) ?? {};
  return { ...flat, fontSize: (flat.fontSize ?? 14) * scale };
}

function contrastColor(c: any, accessible: any): any {
  if (c === staticColors.textSecondary) return accessible.textSecondary;
  if (c === staticColors.textDim) return accessible.textDim;
  if (c === staticColors.textFade) return accessible.textFade;
  if (c === staticColors.textHint) return accessible.textHint;
  return c;
}

export default function ScaledText({ children, style, ...rest }: Props) {
  const { largerText, highContrast } = useAccessibility();
  const colors = useColors();
  const scale = largerText ? 1.2 : 1;

  let scaled = scaleStyle(style, scale);

  // In high contrast mode, remap the low-contrast greys to stronger versions.
  if (highContrast && scaled.color) {
    scaled = { ...scaled, color: contrastColor(scaled.color, colors) };
  }

  return (
    <Text style={[{ color: colors.textPrimary }, scaled]} {...rest}>
      {children}
    </Text>
  );
}
