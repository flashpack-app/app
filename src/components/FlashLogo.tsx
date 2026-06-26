import React from 'react';
import { Text, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { type } from '../theme/typography';

interface Props {
  size?: number;
  style?: TextStyle;
}

const FlashLogo: React.FC<Props> = ({ size = 22, style }) => (
  <Text
    style={[
      { color: colors.white, fontFamily: type.family, fontWeight: '800', fontSize: size, letterSpacing: -0.8 },
      style,
    ]}
  >
    flash<Text style={{ color: colors.yellow }}>.</Text>
  </Text>
);

export default FlashLogo;
