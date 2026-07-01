import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSettings, saveSettings, clearSettings, UserSettings } from '../settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const store = (AsyncStorage as any)._store;
    Object.keys(store).forEach(k => delete store[k]);
  });

  describe('loadSettings', () => {
    it('returns defaults when nothing is stored', async () => {
      const settings = await loadSettings();
      expect(settings.pushNotifications).toBe(true);
      expect(settings.hapticsEnabled).toBe(true);
      expect(settings.reduceMotion).toBe(false);
      expect(settings.highContrast).toBe(false);
      expect(settings.profilePublic).toBe(true);
      expect(settings.biometricLogin).toBe(false);
      expect(settings.silentMode).toBe(false);
      expect(settings.buttonSize).toBe('normal');
    });
  });

  describe('saveSettings', () => {
    it('merges partial updates with defaults', async () => {
      await saveSettings({ hapticsEnabled: false, reduceMotion: true });
      const settings = await loadSettings();
      expect(settings.hapticsEnabled).toBe(false);
      expect(settings.reduceMotion).toBe(true);
      // unchanged defaults
      expect(settings.pushNotifications).toBe(true);
      expect(settings.profilePublic).toBe(true);
    });

    it('preserves previous changes on subsequent saves', async () => {
      await saveSettings({ hapticsEnabled: false });
      await saveSettings({ reduceMotion: true });
      const settings = await loadSettings();
      expect(settings.hapticsEnabled).toBe(false);
      expect(settings.reduceMotion).toBe(true);
    });
  });

  describe('clearSettings', () => {
    it('resets to defaults after clear', async () => {
      await saveSettings({ hapticsEnabled: false, silentMode: true });
      await clearSettings();
      const settings = await loadSettings();
      expect(settings.hapticsEnabled).toBe(true);
      expect(settings.silentMode).toBe(false);
    });
  });
});
