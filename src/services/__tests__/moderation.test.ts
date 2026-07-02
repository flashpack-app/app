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
      expect(ModerationService.isTextSafe('you are a retard')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(ModerationService.isTextSafe('KYS now')).toBe(false);
      expect(ModerationService.isTextSafe('Kys')).toBe(false);
    });

    it('matches multi-word slurs across whitespace', () => {
      expect(ModerationService.isTextSafe('kill  yourself')).toBe(false);
    });

    it('does not flag innocent words that contain banned substrings', () => {
      expect(ModerationService.isTextSafe('skilled worker')).toBe(true);
      expect(ModerationService.isTextSafe('on a diet again')).toBe(true);
      expect(ModerationService.isTextSafe('this view is killer')).toBe(true);
    });

    it('returns true for text with no banned content', () => {
      expect(ModerationService.isTextSafe('this rooftop hit different tonight.')).toBe(true);
      expect(ModerationService.isTextSafe('beach was empty, kinda surreal.')).toBe(true);
    });
  });
});
