import { colors, filterColor, radius } from '../colors';

describe('theme/colors', () => {
  describe('colors', () => {
    it('has the true-black base color', () => {
      expect(colors.black).toBe('#0A0A0A');
    });

    it('has standard UI colors', () => {
      expect(colors.yellow).toBe('#FFD60A');
      expect(colors.green).toBe('#30D158');
      expect(colors.red).toBe('#FF453A');
      expect(colors.white).toBe('#FFFFFF');
    });

    it('has text color variants', () => {
      expect(colors.textPrimary).toBe('#FFFFFF');
      expect(typeof colors.textSecondary).toBe('string');
      expect(typeof colors.textHint).toBe('string');
      expect(typeof colors.textDim).toBe('string');
    });

    it('has surface colors', () => {
      expect(typeof colors.surfaceSoft).toBe('string');
      expect(typeof colors.surfaceMid).toBe('string');
    });
  });

  describe('filterColor', () => {
    it('has a color for each filter', () => {
      const expectedFilters = ['raw', 'cinema', 'maku', 'neagh', 'ontario', 'summer', 'bonboa', 'daisy', 'earth', 'hibiscus'];
      for (const f of expectedFilters) {
        expect(filterColor[f]).toBeDefined();
        expect(filterColor[f]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('has 10 filter colors', () => {
      expect(Object.keys(filterColor)).toHaveLength(10);
    });
  });

  describe('radius', () => {
    it('has expected radius values', () => {
      expect(radius.sm).toBe(8);
      expect(radius.md).toBe(10);
      expect(radius.lg).toBe(12);
      expect(radius.pill).toBe(20);
    });

    it('radii are in ascending order', () => {
      expect(radius.sm).toBeLessThan(radius.md);
      expect(radius.md).toBeLessThan(radius.lg);
      expect(radius.lg).toBeLessThan(radius.pill);
    });
  });
});
