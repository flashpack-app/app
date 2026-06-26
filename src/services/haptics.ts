import * as ExpoHaptics from 'expo-haptics';
import { loadSettings } from './settingsStore';

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

async function enabled(): Promise<boolean> {
  try {
    const s = await loadSettings();
    return s.hapticsEnabled;
  } catch {
    return true;
  }
}

export async function impactAsync(style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Light) {
  if (await enabled()) ExpoHaptics.impactAsync(style);
}

export async function notificationAsync(type: ExpoHaptics.NotificationFeedbackType) {
  if (await enabled()) ExpoHaptics.notificationAsync(type);
}

export async function selectionAsync() {
  if (await enabled()) ExpoHaptics.selectionAsync();
}
