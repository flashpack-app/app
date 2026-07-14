import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_KEY = 'flash.onboarding.coach.v1';
const ONBOARDING_KEY = 'flash.onboarding.complete.v1';

export async function hasSeenCoachmarks(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(COACH_KEY)) === '1';
  } catch (error) {
    console.warn('failed to load coachmark state:', error);
    return false;
  }
}

export async function markCoachmarksSeen(): Promise<void> {
  await AsyncStorage.setItem(COACH_KEY, '1');
}

export async function resetCoachmarks(): Promise<void> {
  await AsyncStorage.removeItem(COACH_KEY);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1';
  } catch (error) {
    console.warn('failed to load onboarding state:', error);
    return false;
  }
}

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1');
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.multiRemove([ONBOARDING_KEY, COACH_KEY]);
}
