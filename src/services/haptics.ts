import * as ExpoHaptics from 'expo-haptics';
import { loadSettings } from './settingsStore';

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

async function enabled(): Promise<boolean> {
  const s = await loadSettings();
  return s.hapticsEnabled;
}

async function runHaptic(action: () => Promise<void>): Promise<void> {
  try {
    if (await enabled()) await action();
  } catch (error) {
    console.warn('haptic feedback failed:', error);
  }
}

export async function impactAsync(style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Light) {
  await runHaptic(() => ExpoHaptics.impactAsync(style));
}

export async function notificationAsync(type: ExpoHaptics.NotificationFeedbackType) {
  await runHaptic(() => ExpoHaptics.notificationAsync(type));
}

export async function selectionAsync() {
  await runHaptic(() => ExpoHaptics.selectionAsync());
}
