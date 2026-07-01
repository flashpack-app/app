import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_KEY = 'flash.onboarding.coach.v1';
const ONBOARDING_KEY = 'flash.onboarding.complete.v1';

export async function hasSeenCoachmarks(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(COACH_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markCoachmarksSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(COACH_KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function resetCoachmarks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(COACH_KEY);
  } catch {
    /* ignore */
  }
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    await AsyncStorage.removeItem(COACH_KEY);
  } catch {
    /* ignore */
  }
}
