import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { UserSettings, loadSettings, saveSettings } from '../services/settingsStore';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings).catch((error) => {
      console.error('failed to initialize settings:', error);
    });
  }, []);

  const patch = async (partial: Partial<UserSettings>): Promise<boolean> => {
    const previous = settings;
    const next = { ...(settings ?? {}), ...partial } as UserSettings;
    setSettings(next);
    try {
      await saveSettings(partial);
      return true;
    } catch (error) {
      console.error('failed to save settings:', error);
      setSettings(previous);
      Alert.alert('settings not saved', 'please try again.');
      return false;
    }
  };

  return { settings, patch };
}
