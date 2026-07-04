// Mock React Native modules that aren't available in Node test env
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock';

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (opts: any) => opts.ios ?? opts.default },
  TextStyle: {},
}), { virtual: true });

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
      removeItem: jest.fn((key: string) => { delete store[key]; return Promise.resolve(); }),
      clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); return Promise.resolve(); }),
      _store: store,
    },
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { apiUrl: 'http://localhost:4000' } },
    manifest: null,
  },
}), { virtual: true });

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}), { virtual: true });

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(false)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(false)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: false })),
}), { virtual: true });

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(),
  allowScreenCaptureAsync: jest.fn(),
  addScreenshotListener: jest.fn(() => ({ remove: jest.fn() })),
}), { virtual: true });

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
}), { virtual: true });

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}), { virtual: true });

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}), { virtual: true });

// Mock require() calls for LUT png assets
jest.mock('../assets/LUTs/generated/cinema.png', () => 'cinema-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/maku.png', () => 'maku-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/neagh.png', () => 'neagh-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/ontario.png', () => 'ontario-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/summer.png', () => 'summer-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/bonboa.png', () => 'bonboa-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/daisy.png', () => 'daisy-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/earth.png', () => 'earth-lut', { virtual: true });
jest.mock('../assets/LUTs/generated/hibiscus.png', () => 'hibiscus-lut', { virtual: true });
