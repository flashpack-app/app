export type ThemeName = 'dark' | 'light';

export interface Palette {
  name: ThemeName;
  black: string;
  card: string;
  border: string;
  borderSoft: string;
  yellow: string;
  green: string;
  red: string;
  amber: string;
  white: string;
  textPrimary: string;
  textSecondary: string;
  textHint: string;
  textDim: string;
  textFade: string;
  surfaceSoft: string;
  surfaceSofter: string;
  surfaceMid: string;
  /** Foreground-tinted overlay, e.g. subtle fills and separators. */
  overlay: (alpha: number) => string;
}

export const darkColors: Palette = {
  name: 'dark',
  black: '#0A0A0A',
  card: '#141414',
  border: '#252525',
  borderSoft: '#1e1e1e',
  yellow: '#FFD60A',
  green: '#30D158',
  red: '#FF453A',
  amber: '#FF9F0A',
  white: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.4)',
  textHint: 'rgba(255,255,255,0.2)',
  textDim: 'rgba(255,255,255,0.3)',
  textFade: 'rgba(255,255,255,0.25)',
  surfaceSoft: 'rgba(255,255,255,0.06)',
  surfaceSofter: 'rgba(255,255,255,0.03)',
  surfaceMid: 'rgba(255,255,255,0.08)',
  overlay: (a: number) => `rgba(255,255,255,${a})`,
};

export const lightColors: Palette = {
  name: 'light',
  black: '#FFFFFF',
  card: '#F5F5F7',
  border: '#D9D9DE',
  borderSoft: '#E6E6EA',
  yellow: '#F5B800',
  green: '#248A3D',
  red: '#D70015',
  amber: '#B25000',
  white: '#0A0A0A',
  textPrimary: '#0A0A0A',
  textSecondary: 'rgba(0,0,0,0.5)',
  textHint: 'rgba(0,0,0,0.28)',
  textDim: 'rgba(0,0,0,0.4)',
  textFade: 'rgba(0,0,0,0.32)',
  surfaceSoft: 'rgba(0,0,0,0.05)',
  surfaceSofter: 'rgba(0,0,0,0.03)',
  surfaceMid: 'rgba(0,0,0,0.07)',
  overlay: (a: number) => `rgba(0,0,0,${a})`,
};

/** Default palette. Kept as the dark theme for backwards compatibility. */
export const colors: Palette = darkColors;

export const filterColor: Record<string, string> = {
  raw: '#B4B2A9',
  cinema: '#C9A36B',
  maku: '#7FA6B0',
  neagh: '#6E8E7C',
  ontario: '#8C7BA6',
  summer: '#E0A94E',
  bonboa: '#D98E8E',
  daisy: '#E6C25A',
  earth: '#A9794B',
  hibiscus: '#C56FA0',
};

export const radius = { sm: 8, md: 10, lg: 12, pill: 20 };
