import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';

interface Particle {
  id: number;
  emoji: string;
  x: number;
  anim: RNAnimated.Value;
  opacity: RNAnimated.Value;
  scale: RNAnimated.Value;
}

let nextId = 0;

export default function FloatingReactions() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<View>(null);

  const spawn = useCallback((emoji: string) => {
    const id = nextId++;
    const anim = new RNAnimated.Value(0);
    const opacity = new RNAnimated.Value(1);
    const scale = new RNAnimated.Value(0.5);
    const x = Math.random() * 200 - 100; // random horizontal offset

    const particle: Particle = { id, emoji, x, anim, opacity, scale };
    setParticles((prev) => [...prev.slice(-8), particle]);

    RNAnimated.parallel([
      RNAnimated.timing(anim, { toValue: -180, duration: 1800, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
      RNAnimated.timing(scale, { toValue: 1.4, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    });
  }, []);

  useEffect(() => {
    (window as any).__spawnFloatingReaction = spawn;
    return () => {
      delete (window as any).__spawnFloatingReaction;
    };
  }, [spawn]);

  return (
    <View ref={containerRef} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map((p) => (
        <RNAnimated.View
          key={p.id}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: p.x },
                { translateY: p.anim },
                { scale: p.scale },
              ],
              opacity: p.opacity,
            },
          ]}
        >
          <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
        </RNAnimated.View>
      ))}
    </View>
  );
}

export function triggerFloatingReaction(emoji: string) {
  (window as any).__spawnFloatingReaction?.(emoji);
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    bottom: 120,
    left: '50%',
    marginLeft: -14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
