import { generateInviteCode, normalize, isValidFormat } from '../codes';

describe('codes', () => {
  describe('generateInviteCode', () => {
    it('produces codes in FLASH-XXX-XX format', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateInviteCode();
        expect(code).toMatch(/^FLASH-[A-Z0-9]{3}-[A-Z0-9]{2}$/);
      }
    });

    it('does not use ambiguous characters (0, O, 1, I)', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateInviteCode();
        const body = code.replace('FLASH-', '').replace('-', '');
        expect(body).not.toMatch(/[01OI]/);
      }
    });

    it('generates unique codes (high probability)', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      // With 30^5 possible codes, 100 should all be unique
      expect(codes.size).toBe(100);
    });
  });

  describe('normalize', () => {
    it('normalizes dash-separated input', () => {
      expect(normalize('FLASH-ABC-12')).toBe('FLASH-ABC-12');
    });

    it('normalizes middle-dot separator', () => {
      expect(normalize('FLASH·ABC·12')).toBe('FLASH-ABC-12');
    });

    it('normalizes underscore separator', () => {
      expect(normalize('FLASH_ABC_12')).toBe('FLASH-ABC-12');
    });

    it('normalizes space separator', () => {
      expect(normalize('FLASH ABC 12')).toBe('FLASH-ABC-12');
    });

    it('normalizes no separator', () => {
      expect(normalize('FLASHABC12')).toBe('FLASH-ABC-12');
    });

    it('handles lowercase input', () => {
      expect(normalize('flash-abc-12')).toBe('FLASH-ABC-12');
    });

    it('trims whitespace', () => {
      expect(normalize('  FLASH-ABC-12  ')).toBe('FLASH-ABC-12');
    });

    it('handles short codes gracefully', () => {
      const result = normalize('FLASH-AB');
      expect(result).toBe('FLASH-AB');
    });

    it('passes through non-FLASH prefixed codes', () => {
      expect(normalize('OTHER-CODE')).toBe('OTHER-CODE');
    });
  });

  describe('isValidFormat', () => {
    it('returns true for valid format', () => {
      expect(isValidFormat('FLASH-ABC-12')).toBe(true);
      expect(isValidFormat('FLASH-XYZ-99')).toBe(true);
    });

    it('returns true for valid codes with different separators', () => {
      expect(isValidFormat('FLASH·ABC·12')).toBe(true);
      expect(isValidFormat('flash_abc_12')).toBe(true);
    });

    it('returns false for too-short codes', () => {
      expect(isValidFormat('FLASH-AB-1')).toBe(false);
    });

    it('returns false for non-FLASH prefix', () => {
      expect(isValidFormat('HELLO-ABC-12')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidFormat('')).toBe(false);
    });
  });
});
