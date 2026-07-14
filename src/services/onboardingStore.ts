import { getFlag, setFlag, removeKeys } from './kvStore';

const COACH_KEY = 'flash.onboarding.coach.v1';
const ONBOARDING_KEY = 'flash.onboarding.complete.v1';

export async function hasSeenCoachmarks(): Promise<boolean> {
  return getFlag(COACH_KEY);
}

export async function markCoachmarksSeen(): Promise<void> {
  await setFlag(COACH_KEY);
}

export async function resetCoachmarks(): Promise<void> {
  await removeKeys(COACH_KEY);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return getFlag(ONBOARDING_KEY);
}

export async function markOnboardingComplete(): Promise<void> {
  await setFlag(ONBOARDING_KEY);
}

export async function resetOnboarding(): Promise<void> {
  await removeKeys(ONBOARDING_KEY, COACH_KEY);
}
