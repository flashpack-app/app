import * as LocalAuthentication from 'expo-local-authentication';
import { getString, setString, removeKeys } from './kvStore';

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
  await setString(BIOMETRIC_USER_KEY, username);
}

export async function getBiometricUsername(): Promise<string | null> {
  return getString(BIOMETRIC_USER_KEY);
}

export async function clearBiometricUsername(): Promise<void> {
  await removeKeys(BIOMETRIC_USER_KEY);
}
