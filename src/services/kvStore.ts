import AsyncStorage from '@react-native-async-storage/async-storage';

// Thin wrappers around AsyncStorage that centralize the try/catch + JSON
// (de)serialization boilerplate repeated across the storage-backed services.
// Reads swallow errors and return a null/default so callers can stay terse;
// writes swallow errors so a failing persist never crashes a flow.

export async function getString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn(`failed to read "${key}" from storage:`, e);
    return null;
  }
}

export async function setString(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn(`failed to write "${key}" to storage:`, e);
  }
}

export async function removeKeys(...keys: string[]): Promise<void> {
  try {
    for (const key of keys) {
      await AsyncStorage.removeItem(key);
    }
  } catch (e) {
    console.warn(`failed to remove ${keys.join(', ')} from storage:`, e);
  }
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await getString(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`failed to parse JSON for "${key}":`, e);
    return null;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  await setString(key, JSON.stringify(value));
}

// Boolean flags are persisted as the string '1' when set and absent otherwise.
export async function getFlag(key: string): Promise<boolean> {
  return (await getString(key)) === '1';
}

export async function setFlag(key: string): Promise<void> {
  await setString(key, '1');
}
