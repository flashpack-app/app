import { User } from '../types/models';
import { getJSON, setJSON, getString, setString, removeKeys } from './kvStore';

const SESSION_KEY = 'flash.session.v1';
const STREAK_DAYS_KEY = 'flash.streakDays.v1';

export interface Session {
  token: string;
  user: User;
}

export async function loadSession(): Promise<Session | null> {
  return getJSON<Session>(SESSION_KEY);
}

export async function saveSession(s: Session): Promise<void> {
  await setJSON(SESSION_KEY, s);
}

export async function clearSession(): Promise<void> {
  await removeKeys(SESSION_KEY);
}

export async function loadLastStreakDays(): Promise<number | null> {
  const raw = await getString(STREAK_DAYS_KEY);
  return raw == null ? null : parseInt(raw, 10);
}

export async function saveLastStreakDays(days: number): Promise<void> {
  await setString(STREAK_DAYS_KEY, days.toString());
}

export async function clearLastStreakDays(): Promise<void> {
  await removeKeys(STREAK_DAYS_KEY);
}

const PACKS_CACHE_KEY = 'flash.cache.packs.v2';
const DISCOVER_CACHE_KEY = 'flash.cache.discover.v2';

export async function loadCachedPacks(): Promise<any[] | null> {
  return getJSON<any[]>(PACKS_CACHE_KEY);
}

export async function saveCachedPacks(packs: any[]): Promise<void> {
  await setJSON(PACKS_CACHE_KEY, packs);
}

export async function loadCachedDiscoverPacks(): Promise<any[] | null> {
  return getJSON<any[]>(DISCOVER_CACHE_KEY);
}

export async function saveCachedDiscoverPacks(packs: any[]): Promise<void> {
  await setJSON(DISCOVER_CACHE_KEY, packs);
}

export async function clearPacksCache(): Promise<void> {
  await removeKeys(PACKS_CACHE_KEY, DISCOVER_CACHE_KEY);
}
