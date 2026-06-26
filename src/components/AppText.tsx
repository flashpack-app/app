import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useAccessibility } from '../services/AccessibilityContext';
import { useColors } from '../theme/useColors';

interface Props extends TextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
  variant?: 'label' | 'body' | 'title';
}

export default function AppText({ children, style, variant = 'body', ...rest }: Props) {
  const a11y = useAccessibility();
  const colors = useColors();
  const scale = a11y.largerText ? 1.2 : 1;

  const baseSize =
    variant === 'label' ? 10 : variant === 'title' ? 16 : 13;

  return (
    <Text
      style={[{ fontSize: baseSize * scale, color: colors.textPrimary }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
