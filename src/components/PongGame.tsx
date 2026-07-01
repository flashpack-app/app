import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';

const { width: SW, height: SH } = Dimensions.get('window');

const W = Math.min(SW - 32, 380);
const H = Math.min(SH * 0.65, 550);

const PADDLE_W = 74;
const PADDLE_H = 12;
const BALL_R = 7;
const SPEED = 3.5;
const AI_SPEED = 2.2;
const WIN_SCORE = 7;

interface Ball { x: number; y: number; vx: number; vy: number }
interface State {
  ball: Ball;
  playerX: number;
  aiX: number;
  playerScore: number;
  aiScore: number;
  phase: 'playing' | 'point' | 'won' | 'lost';
}

function initState(): State {
  const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
  const dir = Math.random() > 0.5 ? 1 : -1;
  // Start ball moving vertically (up or down)
  return {
    ball: {
      x: W / 2,
      y: H / 2,
      vx: SPEED * Math.sin(angle),
      vy: SPEED * dir * Math.cos(angle),
    },
    playerX: W / 2 - PADDLE_W / 2,
    aiX: W / 2 - PADDLE_W / 2,
    playerScore: 0,
    aiScore: 0,
    phase: 'playing',
  };
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PongGame({ visible, onClose }: Props) {
  const { awardPongBadge } = useAppState();
  const stateRef = useRef<State>(initState());
  const [renderTick, setRenderTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  
  const flashColor = useSharedValue('rgba(0,0,0,0)');
  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: flashColor.value,
  }));

  const tick = useCallback(() => setRenderTick((t) => t + 1), []);

  const loop = useCallback((ts: number) => {
    const dt = Math.min(ts - lastRef.current, 32);
    lastRef.current = ts;

    const s = stateRef.current;
    if (s.phase !== 'playing') {
      tick();
      return;
    }

    let { x, y, vx, vy } = s.ball;
    let { playerX, aiX, playerScore, aiScore } = s;

    x += vx;
    y += vy;

    // Left / right wall bounce
    if (x - BALL_R <= 0) { x = BALL_R; vx = Math.abs(vx); }
    if (x + BALL_R >= W)  { x = W - BALL_R; vx = -Math.abs(vx); }

    const PLAYER_Y = H - PADDLE_H - 12;
    const AI_Y = 12;

    // Player paddle collision (bottom)
    if (
      vy > 0 &&
      y + BALL_R >= PLAYER_Y &&
      y + BALL_R <= PLAYER_Y + PADDLE_H &&
      x >= playerX &&
      x <= playerX + PADDLE_W
    ) {
      const rel = (x - (playerX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const angle = rel * 55 * (Math.PI / 180);
      const speed = Math.sqrt(vx * vx + vy * vy) * 1.04;
      vx = Math.sin(angle) * speed;
      vy = -Math.abs(Math.cos(angle) * speed);
      y = PLAYER_Y - BALL_R;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // AI paddle collision (top)
    if (
      vy < 0 &&
      y - BALL_R <= AI_Y + PADDLE_H &&
      y - BALL_R >= AI_Y &&
      x >= aiX &&
      x <= aiX + PADDLE_W
    ) {
      const rel = (x - (aiX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const angle = rel * 55 * (Math.PI / 180);
      const speed = Math.sqrt(vx * vx + vy * vy) * 1.02;
      vx = Math.sin(angle) * speed;
      vy = Math.abs(Math.cos(angle) * speed);
      y = AI_Y + PADDLE_H + BALL_R;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // AI tracking (imperfect)
    const aiCenter = aiX + PADDLE_W / 2;
    if (aiCenter < x - 4) aiX = Math.min(aiX + AI_SPEED, W - PADDLE_W);
    if (aiCenter > x + 4) aiX = Math.max(aiX - AI_SPEED, 0);

    // Scoring
    let phase: State['phase'] = 'playing';
    if (y - BALL_R <= 0) {
      playerScore += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      flashColor.value = withSequence(
        withTiming('rgba(255,214,10,0.5)', { duration: 50 }),
        withTiming('rgba(0,0,0,0)', { duration: 350 })
      );
      if (playerScore >= WIN_SCORE) {
        phase = 'won';
        awardPongBadge().catch((e) => {
          console.warn('awardPongBadge failed:', e);
        });
      }
      else { phase = 'point'; }
    }
    if (y + BALL_R >= H) {
      aiScore += 1;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      flashColor.value = withSequence(
        withTiming('rgba(255,45,45,0.4)', { duration: 50 }),
        withTiming('rgba(0,0,0,0)', { duration: 350 })
      );
      if (aiScore >= WIN_SCORE) { phase = 'lost'; }
      else { phase = 'point'; }
    }

    stateRef.current = { ball: { x, y, vx, vy }, playerX, aiX, playerScore, aiScore, phase };
    tick();

    if (phase === 'playing') {
      rafRef.current = requestAnimationFrame(loop);
    } else if (phase === 'point') {
      setTimeout(() => {
        const prev = stateRef.current;
        const reset = initState();
        stateRef.current = {
          ...reset,
          playerScore: prev.playerScore,
          aiScore: prev.aiScore,
        };
        rafRef.current = requestAnimationFrame(loop);
      }, 600);
    }
  }, [tick]);

  useEffect(() => {
    if (!visible) return;
    stateRef.current = initState();
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, loop]);

  // Player paddle — move on touch X
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e) => {
        const touchX = e.nativeEvent.locationX;
        stateRef.current.playerX = Math.max(0, Math.min(W - PADDLE_W, touchX - PADDLE_W / 2));
      },
    }),
  ).current;

  const s = stateRef.current;

  const restart = () => {
    stateRef.current = initState();
    lastRef.current = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
    tick();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={st.card}>
          <View style={st.header}>
            <Text style={st.title}>pong</Text>
            <View style={st.scoreRow}>
              <Text style={st.scoreYou}>{s.playerScore}</Text>
              <Text style={st.scoreSep}> · </Text>
              <Text style={st.scoreAi}>{s.aiScore}</Text>
            </View>
            <Pressable onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={18} color={colors.white} />
            </Pressable>
          </View>

          <View style={[st.court, { width: W, height: H }]} {...panResponder.panHandlers}>
            {/* Center line (horizontal now) */}
            {Array.from({ length: 14 }).map((_, i) => (
              <View
                key={i}
                style={[st.dashLine, { left: i * (W / 14) + 4, top: H / 2 - 1 }]}
              />
            ))}

            {/* AI paddle (top) */}
            <View
              style={[
                st.paddle,
                st.paddleRight, // still using same color style
                { left: s.aiX, top: 12 },
              ]}
            />

            {/* Player paddle (bottom) */}
            <View
              style={[
                st.paddle,
                st.paddleLeft, // still using same color style
                { left: s.playerX, bottom: 12 },
              ]}
            />

            {/* Ball */}
            <View
              style={[
                st.ball,
                {
                  left: s.ball.x - BALL_R,
                  top: s.ball.y - BALL_R,
                },
              ]}
            />
            
            {/* Screen Flash Overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, flashStyle]} pointerEvents="none" />

            {/* Overlay messages */}
            {s.phase === 'won' && (
              <View style={st.overlay}>
                <Ionicons name="trophy" size={48} color={colors.yellow} />
                <Text style={st.overlayTitle}>congrats!</Text>
                <Text style={st.overlaySub}>you found a secret easter egg and earned a badge! 🏓</Text>
                <Pressable onPress={restart} style={st.overlayBtn}>
                  <Text style={st.overlayBtnText}>play again</Text>
                </Pressable>
              </View>
            )}
            {s.phase === 'lost' && (
              <View style={st.overlay}>
                <Ionicons name="skull-outline" size={40} color="rgba(255,255,255,0.5)" />
                <Text style={st.overlayTitle}>ai wins</Text>
                <Pressable onPress={restart} style={st.overlayBtn}>
                  <Text style={st.overlayBtnText}>try again</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Hint */}
          <Text style={st.hint}>slide finger near the bottom to move your paddle</Text>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    alignItems: 'center',
  },
  header: {
    width: W,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreYou: { color: colors.yellow, fontSize: 18, fontWeight: '800', minWidth: 24, textAlign: 'right' },
  scoreSep: { color: 'rgba(255,255,255,0.2)', fontSize: 18 },
  scoreAi: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '800', minWidth: 24 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  court: {
    backgroundColor: '#060606',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    position: 'relative',
  },
  dashLine: {
    position: 'absolute',
    height: 2,
    width: W / 14 - 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 1,
  },
  paddle: {
    position: 'absolute',
    width: PADDLE_W,
    height: PADDLE_H,
    borderRadius: 5,
  },
  paddleLeft: { backgroundColor: colors.yellow },
  paddleRight: { backgroundColor: 'rgba(255,255,255,0.5)' },
  ball: {
    position: 'absolute',
    width: BALL_R * 2,
    height: BALL_R * 2,
    borderRadius: BALL_R,
    backgroundColor: colors.yellow,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  overlayTitle: { color: colors.white, fontSize: 28, fontWeight: '800' },
  overlaySub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: -8,
    marginBottom: 8,
  },
  overlayBtn: {
    backgroundColor: colors.yellow,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  overlayBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
  hint: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    paddingVertical: 10,
    textAlign: 'center',
  },
});
