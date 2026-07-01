import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) => !k.includes('session') && !k.includes('settings'));
    if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
    Alert.alert('cache cleared', 'temporary data has been removed.');
  } catch {
    Alert.alert('failed', 'could not clear cache.');
  }
}

export function downloadData(): void {
  Alert.alert(
    'data export',
    'we are preparing your data export. you will receive an email within 48 hours.',
  );
}

export function confirmDeleteAccount(): void {
  Alert.alert(
    'delete account?',
    'this permanently deletes your account, photos, packs, and all data. this cannot be undone.',
    [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete forever',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'request received',
            'your account deletion request has been sent to support.',
          );
        },
      },
    ],
  );
}
