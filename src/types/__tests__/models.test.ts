import { ALL_FILTERS, FREE_FILTERS, PRO_FILTERS, VibeFilter } from '../models';

describe('models', () => {
  describe('filter constants', () => {
    it('ALL_FILTERS contains all free and pro filters', () => {
      expect(ALL_FILTERS).toEqual([...FREE_FILTERS, ...PRO_FILTERS]);
    });

    it('FREE_FILTERS has the expected filters', () => {
      expect(FREE_FILTERS).toContain('raw');
      expect(FREE_FILTERS).toContain('cinema');
      expect(FREE_FILTERS).toContain('maku');
      expect(FREE_FILTERS).toContain('neagh');
      expect(FREE_FILTERS).toContain('ontario');
      expect(FREE_FILTERS).toContain('summer');
      expect(FREE_FILTERS).toHaveLength(6);
    });

    it('PRO_FILTERS has the expected filters', () => {
      expect(PRO_FILTERS).toContain('bonboa');
      expect(PRO_FILTERS).toContain('daisy');
      expect(PRO_FILTERS).toContain('earth');
      expect(PRO_FILTERS).toContain('hibiscus');
      expect(PRO_FILTERS).toHaveLength(4);
    });

    it('ALL_FILTERS has 10 filters total', () => {
      expect(ALL_FILTERS).toHaveLength(10);
    });

    it('no duplicates in ALL_FILTERS', () => {
      const unique = new Set(ALL_FILTERS);
      expect(unique.size).toBe(ALL_FILTERS.length);
    });

    it('free and pro filters do not overlap', () => {
      const overlap = FREE_FILTERS.filter(f => PRO_FILTERS.includes(f));
      expect(overlap).toHaveLength(0);
    });
  });
});
