import React, { useEffect } from 'react';
import { View, Text, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useColors } from '../theme/useColors';
import { type } from '../theme/typography';

interface Props {
  size?: number;
  style?: TextStyle;
  isLive?: boolean;
}

const FlashLogo: React.FC<Props> = ({ size = 22, style, isLive }) => {
  const colors = useColors();
  const anim = useSharedValue(isLive ? 1 : 0);

  useEffect(() => {
    anim.value = withSpring(isLive ? 1 : 0, { damping: 14, stiffness: 150 });
  }, [isLive]);

  const liveStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [
      { translateX: (1 - anim.value) * -12 },
      { scale: 0.8 + 0.2 * anim.value }
    ],
    position: 'absolute',
    left: '100%',
    marginLeft: 2,
  }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text
        style={[
          { color: colors.white, fontFamily: type.family, fontWeight: '800', fontSize: size, letterSpacing: -0.8 },
          style,
        ]}
      >
        flash<Text style={{ color: colors.yellow }}>.</Text>
      </Text>
      <Animated.View style={liveStyle} pointerEvents="none">
        <Text
          style={[
            { color: colors.white, fontFamily: type.family, fontWeight: '800', fontSize: size, letterSpacing: -0.8 },
            style,
          ]}
        >
          live
        </Text>
      </Animated.View>
    </View>
  );
};

export default FlashLogo;
