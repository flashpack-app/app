import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_USER_KEY = '@flash_biometric_username';

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function promptBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'authenticate with biometrics',
      fallbackLabel: 'use passcode',
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function saveBiometricUsername(username: string): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_USER_KEY, username);
}

export async function getBiometricUsername(): Promise<string | null> {
  return await AsyncStorage.getItem(BIOMETRIC_USER_KEY);
}

export async function clearBiometricUsername(): Promise<void> {
  await AsyncStorage.removeItem(BIOMETRIC_USER_KEY);
}
