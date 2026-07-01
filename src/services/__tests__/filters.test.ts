import { filterDefs, normalizeFilter, getFilterDef, FILTER_LABEL } from '../filters';
import { ALL_FILTERS, FREE_FILTERS, PRO_FILTERS } from '../../types/models';

describe('filters', () => {
  describe('filterDefs', () => {
    it('has a definition for every filter in ALL_FILTERS', () => {
      for (const f of ALL_FILTERS) {
        expect(filterDefs[f]).toBeDefined();
        expect(filterDefs[f].label).toBe(f);
        expect(typeof filterDefs[f].color).toBe('string');
        expect(typeof filterDefs[f].description).toBe('string');
      }
    });

    it('marks free filters as isPro=false', () => {
      for (const f of FREE_FILTERS) {
        expect(filterDefs[f].isPro).toBe(false);
      }
    });

    it('marks pro filters as isPro=true', () => {
      for (const f of PRO_FILTERS) {
        expect(filterDefs[f].isPro).toBe(true);
      }
    });

    it('raw filter has no LUT', () => {
      expect(filterDefs.raw.lut).toBeUndefined();
      expect(filterDefs.raw.lutSize).toBeUndefined();
    });

    it('non-raw filters have a LUT and lutSize=33', () => {
      const nonRaw = ALL_FILTERS.filter(f => f !== 'raw');
      for (const f of nonRaw) {
        expect(filterDefs[f].lut).toBeDefined();
        expect(filterDefs[f].lutSize).toBe(33);
      }
    });
  });

  describe('normalizeFilter', () => {
    it('returns the filter when it is a valid VibeFilter', () => {
      expect(normalizeFilter('raw')).toBe('raw');
      expect(normalizeFilter('cinema')).toBe('cinema');
      expect(normalizeFilter('hibiscus')).toBe('hibiscus');
    });

    it('returns "raw" for null', () => {
      expect(normalizeFilter(null)).toBe('raw');
    });

    it('returns "raw" for undefined', () => {
      expect(normalizeFilter(undefined)).toBe('raw');
    });

    it('returns "raw" for unknown/legacy filter names', () => {
      expect(normalizeFilter('moody')).toBe('raw');
      expect(normalizeFilter('vhs')).toBe('raw');
      expect(normalizeFilter('sepia')).toBe('raw');
    });

    it('returns "raw" for empty string', () => {
      expect(normalizeFilter('')).toBe('raw');
    });
  });

  describe('getFilterDef', () => {
    it('returns correct definition for valid filter', () => {
      const def = getFilterDef('cinema');
      expect(def.label).toBe('cinema');
      expect(def.color).toBe('#C9A36B');
    });

    it('returns raw definition for unknown filter', () => {
      const def = getFilterDef('nonexistent');
      expect(def.label).toBe('raw');
    });

    it('returns raw definition for null', () => {
      const def = getFilterDef(null);
      expect(def.label).toBe('raw');
    });
  });

  describe('FILTER_LABEL', () => {
    it('maps every filter to its label', () => {
      for (const f of ALL_FILTERS) {
        expect(FILTER_LABEL[f]).toBe(f);
      }
    });

    it('has exactly the same number of entries as ALL_FILTERS', () => {
      expect(Object.keys(FILTER_LABEL).length).toBe(ALL_FILTERS.length);
    });
  });
});
