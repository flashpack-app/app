import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Resolve the API URL from app.json `extra.apiUrl` with sensible per-platform defaults.
// On a real device, we try to auto-detect from the Expo dev server hostUri so you
// never have to edit app.json when your laptop IP changes.
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromExtra =
  fromEnv ||
  (Constants.expoConfig?.extra as any)?.apiUrl ||
  (Constants.manifest as any)?.extra?.apiUrl;

function devServerIp(): string | null {
  // Expo dev server URI looks like "192.168.1.42:8081" — same machine as the backend
  const hostUri = (Constants.expoConfig as any)?.hostUri ?? (Constants.manifest as any)?.debuggerHost;
  if (!hostUri) return null;
  const ip = hostUri.split(':')[0];
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') return null;
  return ip;
}

function defaultUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000'; // Android emulator -> host
  const ip = devServerIp();
  if (ip) return `http://${ip}:4000`;
  return 'http://localhost:4000';
}

export const API_URL: string = fromExtra || defaultUrl();
