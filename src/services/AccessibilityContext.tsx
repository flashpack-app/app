import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings, UserSettings } from './settingsStore';

type Accessibility = Pick<
  UserSettings,
  'hapticsEnabled' | 'reduceMotion' | 'minimizeAnimations' | 'highContrast' | 'largerText' | 'screenReaderOptimized' | 'buttonSize'
>;

type ContextValue = Accessibility & { refresh: () => Promise<void> };

const AccessibilityContext = createContext<ContextValue | null>(null);

function pickAccessibility(s: UserSettings): Accessibility {
  return {
    hapticsEnabled: s.hapticsEnabled,
    reduceMotion: s.reduceMotion,
    minimizeAnimations: s.minimizeAnimations,
    highContrast: s.highContrast,
    largerText: s.largerText,
    screenReaderOptimized: s.screenReaderOptimized,
    buttonSize: s.buttonSize,
  };
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [a11y, setA11y] = useState<Accessibility | null>(null);

  const refresh = useCallback(async () => {
    const s = await loadSettings();
    setA11y(pickAccessibility(s));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!a11y) return <>{children}</>;
  const value: ContextValue = { ...a11y, refresh };
  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): ContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be inside AccessibilityProvider');
  }
  return ctx;
}

export async function updateAccessibilitySettings(partial: Partial<Accessibility>): Promise<void> {
  await saveSettings(partial);
}
