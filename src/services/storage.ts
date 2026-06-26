import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/models';

const SESSION_KEY = 'flash.session.v1';

export interface Session {
  token: string;
  user: User;
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function saveSession(s: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
