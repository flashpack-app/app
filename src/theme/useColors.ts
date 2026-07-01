import { useColorScheme } from 'react-native';
import { useAccessibility } from '../services/AccessibilityContext';
import { darkColors, lightColors, Palette } from './colors';

export function useColors(): Palette {
  const { highContrast, theme } = useAccessibility();
  const systemScheme = useColorScheme();

  const resolved = theme === 'system' ? systemScheme ?? 'dark' : theme;
  const base = resolved === 'light' ? lightColors : darkColors;

  if (!highContrast) return base;

  if (base.name === 'light') {
    return {
      ...base,
      // High contrast darkens text/borders so they don't wash out on light.
      textSecondary: 'rgba(0,0,0,0.75)',
      textDim: 'rgba(0,0,0,0.65)',
      textFade: 'rgba(0,0,0,0.6)',
      textHint: 'rgba(0,0,0,0.5)',
      border: '#B8B8BE',
      borderSoft: '#C8C8CE',
      surfaceMid: 'rgba(0,0,0,0.12)',
      surfaceSoft: 'rgba(0,0,0,0.10)',
    };
  }

  return {
    ...base,
    // High contrast pushes all text closer to full white so it doesn't wash out
    // against dark backgrounds.
    textSecondary: '#E0E0E0',
    textDim: '#B0B0B0',
    textFade: '#A0A0A0',
    textHint: '#808080',
    border: '#3A3A3A',
    borderSoft: '#303030',
    surfaceMid: 'rgba(255,255,255,0.12)',
    surfaceSoft: 'rgba(255,255,255,0.10)',
  };
}
