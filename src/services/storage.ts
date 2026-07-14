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

const PACKS_CACHE_KEY = 'flash.cache.packs.v2';
const DISCOVER_CACHE_KEY = 'flash.cache.discover.v2';

export async function loadCachedPacks(): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PACKS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('failed to load cached packs:', e);
    return null;
  }
}

export async function saveCachedPacks(packs: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PACKS_CACHE_KEY, JSON.stringify(packs));
  } catch (e) {
    console.warn('failed to save cached packs:', e);
  }
}

export async function loadCachedDiscoverPacks(): Promise<any[] | null> {
  try {
    const raw = await AsyncStorage.getItem(DISCOVER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('failed to load cached discover packs:', e);
    return null;
  }
}

export async function saveCachedDiscoverPacks(packs: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DISCOVER_CACHE_KEY, JSON.stringify(packs));
  } catch (e) {
    console.warn('failed to save cached discover packs:', e);
  }
}

export async function clearPacksCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PACKS_CACHE_KEY);
    await AsyncStorage.removeItem(DISCOVER_CACHE_KEY);
  } catch (e) {
    console.warn('failed to clear packs cache:', e);
  }
}

