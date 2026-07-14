import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings, UserSettings, DEFAULT_SETTINGS } from './settingsStore';
import { setLanguage } from './i18n';

type Accessibility = Pick<
  UserSettings,
  'hapticsEnabled' | 'reduceMotion' | 'minimizeAnimations' | 'highContrast' | 'largerText' | 'screenReaderOptimized' | 'buttonSize' | 'theme' | 'language'
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
    theme: s.theme,
    language: s.language ?? 'system',
  };
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [a11y, setA11y] = useState<Accessibility | null>(null);

  const refresh = useCallback(async () => {
    const s = await loadSettings();
    setLanguage(s.language ?? 'system');
    setA11y(pickAccessibility(s));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: ContextValue = { ...(a11y ?? pickAccessibility(DEFAULT_SETTINGS)), refresh };
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
