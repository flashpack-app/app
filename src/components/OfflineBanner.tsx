import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
}

/**
 * A sticky banner that slides in from the top when the device goes offline
 * and slides out automatically when connectivity returns.
 */
export default function OfflineBanner({ visible }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -80,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible, translateY]);

  // Keep rendered so the slide-out animation plays before unmounting
  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.pill}>
        <Ionicons name="wifi-outline" size={14} color="#fff" style={styles.icon} />
        <Text style={styles.text}>no internet connection</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingBottom: 8,
    // deep dark translucent strip
    backgroundColor: 'rgba(10,10,10,0.92)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    opacity: 0.85,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    opacity: 0.9,
  },
});
