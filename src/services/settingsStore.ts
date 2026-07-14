import { getJSON, setJSON, removeKeys } from './kvStore';

export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguageMode = 'system' | 'en' | 'tr';

export interface UserSettings {
  // appearance
  theme: ThemeMode;
  language?: LanguageMode;

  // notifications
  pushNotifications: boolean;
  pushNewPacks: boolean;
  pushComments: boolean;
  pushReactions: boolean;
  pushStreakReminders: boolean;
  inAppNotifications: boolean;
  inAppNewPacks: boolean;
  inAppComments: boolean;
  emailNotifications: boolean;
  emailWeeklyDigest: boolean;
  screenshotWarnings: boolean;
  soundEffects: boolean;
  vibration: boolean;

  // privacy
  profilePublic: boolean;
  showLocation: boolean; // city + country vs country only
  showStreakPublic: boolean;
  showActivityStatus: boolean;
  allowMentions: boolean;
  autoSaveCameraRoll: boolean;
  showPackPreviews: boolean;
  blockScreenshots: boolean;

  // accessibility
  hapticsEnabled: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  largerText: boolean;
  screenReaderOptimized: boolean;
  minimizeAnimations: boolean;
  buttonSize: 'normal' | 'large';

  // data & security
  biometricLogin: boolean;
  twoFactorAuth: boolean;

  // pro
  silentMode: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  language: 'system',

  pushNotifications: true,
  pushNewPacks: true,
  pushComments: true,
  pushReactions: true,
  pushStreakReminders: true,
  inAppNotifications: true,
  inAppNewPacks: true,
  inAppComments: true,
  emailNotifications: false,
  emailWeeklyDigest: false,
  screenshotWarnings: true,
  soundEffects: true,
  vibration: true,

  profilePublic: true,
  showLocation: true,
  showStreakPublic: true,
  showActivityStatus: true,
  allowMentions: true,
  autoSaveCameraRoll: false,
  showPackPreviews: true,
  blockScreenshots: false,

  hapticsEnabled: true,
  reduceMotion: false,
  highContrast: false,
  largerText: false,
  screenReaderOptimized: false,
  minimizeAnimations: false,
  buttonSize: 'normal',

  biometricLogin: false,
  twoFactorAuth: false,

  silentMode: false,
};

const KEY = '@flash_settings';

export async function loadSettings(): Promise<UserSettings> {
  const stored = await getJSON<Partial<UserSettings>>(KEY);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(patch: Partial<UserSettings>): Promise<void> {
  const current = await loadSettings();
  await setJSON(KEY, { ...current, ...patch });
}

export async function clearSettings(): Promise<void> {
  await removeKeys(KEY);
}
