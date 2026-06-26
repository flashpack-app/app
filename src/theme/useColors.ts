import { useAccessibility } from '../services/AccessibilityContext';
import { colors } from './colors';

export function useColors() {
  const { highContrast } = useAccessibility();

  if (!highContrast) return colors;

  return {
    ...colors,
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
