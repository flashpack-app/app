import React, { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useCoachmark, CoachRect } from './CoachmarkContext';

interface Props extends BottomTabBarButtonProps {
  coachId: string;
}

/**
 * Drop-in replacement for a tab bar button that also registers its on-screen
 * position with the coachmark system so the spotlight can target it.
 */
const CoachTabButton: React.FC<Props> = ({ coachId, children, style, ref: _ref, ...rest }) => {
  const ref = useRef<View>(null);
  const { registerTarget, unregisterTarget } = useCoachmark();

  useEffect(() => {
    const measure = (): Promise<CoachRect | null> =>
      new Promise((resolve) => {
        const node = ref.current;
        if (!node) return resolve(null);
        node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
      });
    registerTarget(coachId, measure);
    return () => unregisterTarget(coachId);
  }, [coachId, registerTarget, unregisterTarget]);

  return (
    <View ref={ref} collapsable={false} style={styles.wrap}>
      <Pressable {...rest} style={styles.pressable}>
        {children}
      </Pressable>
    </View>
  );
};

const styles = {
  wrap: { flex: 1 },
  pressable: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

export default CoachTabButton;
