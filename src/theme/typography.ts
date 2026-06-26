import { Platform, TextStyle } from 'react-native';

const family = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });

export const type = {
  family,
  // sizes scaled up slightly from the prompt's micro-sizes for RN readability
  logo: { fontFamily: family, fontSize: 22, fontWeight: '800' as TextStyle['fontWeight'], letterSpacing: -0.8 },
  title: { fontFamily: family, fontSize: 22, fontWeight: '700' as TextStyle['fontWeight'], letterSpacing: -0.4 },
  h1: { fontFamily: family, fontSize: 28, fontWeight: '800' as TextStyle['fontWeight'], letterSpacing: -0.6 },
  body: { fontFamily: family, fontSize: 13, fontWeight: '400' as TextStyle['fontWeight'] },
  small: { fontFamily: family, fontSize: 11, fontWeight: '400' as TextStyle['fontWeight'] },
  micro: { fontFamily: family, fontSize: 10, fontWeight: '500' as TextStyle['fontWeight'] },
  tiny: { fontFamily: family, fontSize: 9, fontWeight: '500' as TextStyle['fontWeight'] },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
};
