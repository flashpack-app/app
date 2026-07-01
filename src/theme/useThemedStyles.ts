import { useMemo } from 'react';
import type { Palette } from './colors';
import { useColors } from './useColors';

/**
 * Builds a StyleSheet from the active palette and memoizes it so styles are
 * only recomputed when the theme changes.
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
