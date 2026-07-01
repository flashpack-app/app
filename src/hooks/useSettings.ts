import { useEffect, useState } from 'react';
import { UserSettings, loadSettings, saveSettings } from '../services/settingsStore';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const patch = (partial: Partial<UserSettings>) => {
    const next = { ...(settings ?? {}), ...partial } as UserSettings;
    setSettings(next);
    saveSettings(partial);
  };

  return { settings, patch };
}
