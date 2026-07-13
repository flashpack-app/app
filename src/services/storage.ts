import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/models';

const SESSION_KEY = 'flash.session.v1';
const STREAK_DAYS_KEY = 'flash.streakDays.v1';

export interface Session {
  token: string;
  user: User;
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch (e) {
    console.warn('failed to load session from storage:', e);
    return null;
  }
}

export async function saveSession(s: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function loadLastStreakDays(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_DAYS_KEY);
    if (!raw) return null;
    return parseInt(raw, 10);
  } catch (e) {
    console.warn('failed to load last streak days from storage:', e);
    return null;
  }
}

export async function saveLastStreakDays(days: number): Promise<void> {
  await AsyncStorage.setItem(STREAK_DAYS_KEY, days.toString());
}

export async function clearLastStreakDays(): Promise<void> {
  await AsyncStorage.removeItem(STREAK_DAYS_KEY);
}
