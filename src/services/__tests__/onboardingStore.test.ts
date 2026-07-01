import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSeenCoachmarks, markCoachmarksSeen, resetCoachmarks } from '../onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const store = (AsyncStorage as any)._store;
    Object.keys(store).forEach(k => delete store[k]);
  });

  describe('hasSeenCoachmarks', () => {
    it('returns false initially', async () => {
      expect(await hasSeenCoachmarks()).toBe(false);
    });
  });

  describe('markCoachmarksSeen', () => {
    it('sets the flag so hasSeenCoachmarks returns true', async () => {
      await markCoachmarksSeen();
      expect(await hasSeenCoachmarks()).toBe(true);
    });
  });

  describe('resetCoachmarks', () => {
    it('clears the flag so hasSeenCoachmarks returns false again', async () => {
      await markCoachmarksSeen();
      expect(await hasSeenCoachmarks()).toBe(true);
      await resetCoachmarks();
      expect(await hasSeenCoachmarks()).toBe(false);
    });
  });
});
