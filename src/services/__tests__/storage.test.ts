import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSession, saveSession, clearSession, Session } from '../storage';

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the mock store
    const store = (AsyncStorage as any)._store;
    Object.keys(store).forEach(k => delete store[k]);
  });

  const mockSession: Session = {
    token: 'tok-abc',
    user: {
      id: 'u-1',
      username: 'testuser',
      phoneNumber: '+1234567890',
      isAdmin: false,
      inviteCode: 'FLASH-ABC-12',
      inviteSlots: 3,
      streakDays: 10,
      isPro: false,
      vibeProfile: { filterUsage: { raw: 1, cinema: 0, maku: 0, neagh: 0, ontario: 0, summer: 0, bonboa: 0, daisy: 0, earth: 0, hibiscus: 0 } },
      joinedAt: '2024-01-01',
      city: 'london',
      country: 'GB',
      flag: '🇬🇧',
      packs: 5,
      countries: 2,
      saved: 1,
      packedWith: [],
    },
  };

  describe('saveSession', () => {
    it('persists session to AsyncStorage', async () => {
      await saveSession(mockSession);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'flash.session.v1',
        JSON.stringify(mockSession),
      );
    });
  });

  describe('loadSession', () => {
    it('returns null when no session stored', async () => {
      const result = await loadSession();
      expect(result).toBeNull();
    });

    it('returns session after save', async () => {
      await saveSession(mockSession);
      const result = await loadSession();
      expect(result).toEqual(mockSession);
    });
  });

  describe('clearSession', () => {
    it('removes session from AsyncStorage', async () => {
      await saveSession(mockSession);
      await clearSession();
      const result = await loadSession();
      expect(result).toBeNull();
    });
  });
});
