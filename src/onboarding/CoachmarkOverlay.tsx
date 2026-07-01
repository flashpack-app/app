import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { CoachRect, CoachStep } from './CoachmarkContext';

interface Props {
  rect: CoachRect | null;
  step: CoachStep;
  index: number;
  total: number;
  onNext: () => void;
  onSkip: () => void;
}

const DIM = 'rgba(0,0,0,0.80)';
const PAD = 10;
const TOOLTIP_WIDTH = 280;
const TOOLTIP_MARGIN = 16;

const CoachmarkOverlay: React.FC<Props> = ({ rect, step, index, total, onNext, onSkip }) => {
  const styles = useThemedStyles(makeStyles);
  const { width: screenW, height: screenH } = Dimensions.get('window');
  const isLast = index === total - 1;

  // Spotlight hole geometry (with padding around the target).
  const hole = rect
    ? {
        x: Math.max(0, rect.x - PAD),
        y: Math.max(0, rect.y - PAD),
        w: rect.width + PAD * 2,
        h: rect.height + PAD * 2,
      }
    : null;

  // Decide whether the tooltip sits above or below the spotlight.
  const placeAbove = hole ? hole.y > screenH / 2 : false;

  // Horizontal position of the tooltip, centered on the hole and clamped on-screen.
  const holeCenterX = hole ? hole.x + hole.w / 2 : screenW / 2;
  let tooltipLeft = holeCenterX - TOOLTIP_WIDTH / 2;
  tooltipLeft = Math.max(
    TOOLTIP_MARGIN,
    Math.min(tooltipLeft, screenW - TOOLTIP_WIDTH - TOOLTIP_MARGIN),
  );

  const tooltipStyle = hole
    ? placeAbove
      ? { left: tooltipLeft, bottom: screenH - hole.y + 14 }
      : { left: tooltipLeft, top: hole.y + hole.h + 14 }
    : { left: tooltipLeft, top: screenH / 2 - 80 };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dim layers. With a spotlight we draw four rects around the hole so the
          target stays bright; without one we dim the whole screen. */}
      {hole ? (
        <>
          <Pressable style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.y }]} onPress={onNext} />
          <Pressable
            style={[styles.dim, { top: hole.y + hole.h, left: 0, right: 0, bottom: 0 }]}
            onPress={onNext}
          />
          <Pressable
            style={[styles.dim, { top: hole.y, left: 0, width: hole.x, height: hole.h }]}
            onPress={onNext}
          />
          <Pressable
            style={[
              styles.dim,
              { top: hole.y, left: hole.x + hole.w, right: 0, height: hole.h },
            ]}
            onPress={onNext}
          />
          {/* Highlight ring around the spotlight */}
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              { left: hole.x, top: hole.y, width: hole.w, height: hole.h },
            ]}
          />
        </>
      ) : (
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: DIM }]} onPress={onNext} />
      )}

      {/* Tooltip card */}
      <View style={[styles.tooltip, tooltipStyle]} pointerEvents="auto">
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.text}>{step.text}</Text>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {Array.from({ length: total }, (_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.actions}>
            {!isLast && (
              <Pressable hitSlop={8} onPress={onSkip} style={styles.skipBtn}>
                <Text style={styles.skipText}>skip</Text>
              </Pressable>
            )}
            <Pressable onPress={onNext} style={styles.nextBtn}>
              <Text style={styles.nextText}>{isLast ? 'got it' : 'next'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 6,
  },
  title: { color: colors.yellow, fontSize: 14, fontWeight: '800' },
  text: { color: colors.textPrimary, fontSize: 13, lineHeight: 19 },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: { flexDirection: 'row', gap: 5 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: { backgroundColor: colors.yellow, width: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  skipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  nextBtn: {
    backgroundColor: colors.yellow,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  nextText: { color: '#000', fontSize: 12, fontWeight: '800' },
});

export default CoachmarkOverlay;
