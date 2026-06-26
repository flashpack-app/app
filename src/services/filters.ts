import { VibeFilter, ALL_FILTERS } from '../types/models';

// Each non-raw filter is a real 3D LUT (.cube) baked into a 2D "strip" PNG texture
// (size*size wide, size tall) via scripts/convertLuts.js. Applied on the GPU through
// a Skia RuntimeShader in FilteredImage. `raw` has no LUT.
export interface FilterDef {
  label: string;       // display name
  color: string;       // accent color used in UI chips / vibemeter
  description: string;  // short subtitle
  isPro: boolean;
  lut?: number;        // require() of the generated LUT png (undefined for raw)
  lutSize?: number;    // cube size (33)
  intensity?: number;  // 0..1 LUT blend strength (default 1)
}

const LUT_SIZE = 33;

export const filterDefs: Record<VibeFilter, FilterDef> = {
  raw: {
    label: 'raw',
    color: '#B4B2A9',
    description: 'no filter · untouched',
    isPro: false,
  },
  cinema: {
    label: 'cinema',
    color: '#C9A36B',
    description: 'teal & orange · filmic',
    isPro: false,
    lut: require('../assets/LUTs/generated/cinema.png'),
    lutSize: LUT_SIZE,
  },
  maku: {
    label: 'maku',
    color: '#7FA6B0',
    description: 'cool muted · matte',
    isPro: false,
    lut: require('../assets/LUTs/generated/maku.png'),
    lutSize: LUT_SIZE,
  },
  neagh: {
    label: 'neagh',
    color: '#6E8E7C',
    description: 'green earth · moody',
    isPro: false,
    lut: require('../assets/LUTs/generated/neagh.png'),
    lutSize: LUT_SIZE,
  },
  ontario: {
    label: 'ontario',
    color: '#8C7BA6',
    description: 'soft violet · clean',
    isPro: false,
    lut: require('../assets/LUTs/generated/ontario.png'),
    lutSize: LUT_SIZE,
  },
  summer: {
    label: 'summer',
    color: '#E0A94E',
    description: 'warm golden · bright',
    isPro: false,
    lut: require('../assets/LUTs/generated/summer.png'),
    lutSize: LUT_SIZE,
  },
  bonboa: {
    label: 'bonboa',
    color: '#D98E8E',
    description: 'rosy fade · dreamy',
    isPro: true,
    lut: require('../assets/LUTs/generated/bonboa.png'),
    lutSize: LUT_SIZE,
  },
  daisy: {
    label: 'daisy',
    color: '#E6C25A',
    description: 'sunlit cream · airy',
    isPro: true,
    lut: require('../assets/LUTs/generated/daisy.png'),
    lutSize: LUT_SIZE,
  },
  earth: {
    label: 'earth',
    color: '#A9794B',
    description: 'rich terracotta · warm',
    isPro: true,
    lut: require('../assets/LUTs/generated/earth.png'),
    lutSize: LUT_SIZE,
  },
  hibiscus: {
    label: 'hibiscus',
    color: '#C56FA0',
    description: 'vivid magenta · punchy',
    isPro: true,
    lut: require('../assets/LUTs/generated/hibiscus.png'),
    lutSize: LUT_SIZE,
  },
};

// Map any unknown / legacy filter value (e.g. old DB rows: 'moody', 'vhs') to a safe default.
export function normalizeFilter(f: string | null | undefined): VibeFilter {
  if (f && (ALL_FILTERS as string[]).includes(f)) return f as VibeFilter;
  return 'raw';
}

export function getFilterDef(f: string | null | undefined): FilterDef {
  return filterDefs[normalizeFilter(f)];
}

export const FILTER_LABEL: Record<VibeFilter, string> = ALL_FILTERS.reduce(
  (acc, f) => ({ ...acc, [f]: filterDefs[f].label }),
  {} as Record<VibeFilter, string>,
);
