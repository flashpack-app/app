import { ModerationService } from '../moderation';

describe('ModerationService', () => {
  describe('isTextSafe', () => {
    it('returns true for clean text', () => {
      expect(ModerationService.isTextSafe('hello world')).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(ModerationService.isTextSafe('')).toBe(true);
    });

    it('returns false for text containing a banned term', () => {
      expect(ModerationService.isTextSafe('you should die')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(ModerationService.isTextSafe('KILL it')).toBe(false);
      expect(ModerationService.isTextSafe('Kill')).toBe(false);
    });

    it('detects banned terms embedded in longer words', () => {
      expect(ModerationService.isTextSafe('skilled worker')).toBe(false);
    });

    it('returns true for text with no banned content', () => {
      expect(ModerationService.isTextSafe('this rooftop hit different tonight.')).toBe(true);
      expect(ModerationService.isTextSafe('beach was empty, kinda surreal.')).toBe(true);
    });

    it('detects multiple banned terms', () => {
      expect(ModerationService.isTextSafe('die and kill')).toBe(false);
    });
  });

  describe('isImageSafe', () => {
    it('always returns true (stub)', async () => {
      const result = await ModerationService.isImageSafe('file:///some/path.jpg');
      expect(result).toBe(true);
    });

    it('returns true for empty uri', async () => {
      const result = await ModerationService.isImageSafe('');
      expect(result).toBe(true);
    });
  });
});
