import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Animated as RNAnimated } from 'react-native';
import { CameraView, useCameraPermissions, FlashMode, CameraType } from 'expo-camera';
import * as Haptics from '../services/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import FlashLogo from '../components/FlashLogo';
import FilterStrip from '../components/FilterStrip';
import { colors, filterColor } from '../theme/colors';
import { useAppState } from '../state/AppState';
import { VibeFilter, PRO_FILTERS } from '../types/models';
import { FILTER_LABEL } from '../services/filters';

function isCameraLocked(lastPostAt: string | null): boolean {
  if (!lastPostAt) return false;
  return Date.now() - new Date(lastPostAt).getTime() < 24 * 3600 * 1000;
}

function lockCountdown(lastPostAt: string | null): string {
  if (!lastPostAt) return '';
  const ms = 24 * 3600 * 1000 - (Date.now() - new Date(lastPostAt).getTime());
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${m}m`;
}

const TIMER_OPTIONS = [0, 3, 5, 10];

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [filter, setFilter] = useState<VibeFilter>('raw');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [facing, setFacing] = useState<CameraType>('back');
  const [focusPos, setFocusPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(0);
  const [timerSec, setTimerSec] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const flashOpacity = useRef(new RNAnimated.Value(0)).current;
  const baseZoom = useRef(0);
  const camRef = useRef<CameraView>(null);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { lastPostAt, lastPostedPhotoId, revertPhoto, refreshPacks, dailyTopic, user } = useAppState();
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastPostAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [lastPostAt]);
  const locked = isCameraLocked(lastPostAt);
  const lockTimer = lockCountdown(lastPostAt);
  const undoWindowMs = user?.isAdmin ? Infinity : user?.isPro ? 4 * 3600 * 1000 : 2 * 3600 * 1000;
  const canUndo =
    !!lastPostAt &&
    !!lastPostedPhotoId &&
    (undoWindowMs === Infinity || Date.now() - new Date(lastPostAt).getTime() < undoWindowMs);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  const flashOverlayPlay = () => {
    RNAnimated.sequence([
      RNAnimated.timing(flashOpacity, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(flashOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const takePicture = async () => {
    if (!camRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (flash === 'on') flashOverlayPlay();
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        nav.navigate('PhotoPreview', { uri: photo.uri, filter });
      }
    } catch {
    } finally {
      setIsCapturing(false);
    }
  };

  const isProFilter = PRO_FILTERS.includes(filter);
  const canCapture = !isProFilter || user?.isPro;

  const onShutter = async () => {
    if (!camRef.current || isCapturing || locked) return;
    if (!canCapture) {
      nav.navigate('Pro');
      return;
    }
    if (timerSec > 0) {
      setIsCapturing(true);
      setCountdown(timerSec);
      let remaining = timerSec;
      const interval = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown(0);
          takePicture();
        }
      }, 1000);
      return;
    }
    setIsCapturing(true);
    takePicture();
  };

  const onTapFocus = (e: any) => {
    setFocusPos({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
  };

  const cycleTimer = () => {
    const idx = TIMER_OPTIONS.indexOf(timerSec);
    setTimerSec(TIMER_OPTIONS[(idx + 1) % TIMER_OPTIONS.length]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onPinchEvent = (event: any) => {
    const scale = event.nativeEvent.scale;
    let z = baseZoom.current + (scale - 1) * 0.5;
    z = Math.min(1, Math.max(0, z));
    setZoom(z);
  };

  const onPinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      baseZoom.current = zoom;
    }
  };

  const tint = filter === 'raw' ? null : filterColor[filter];

  return (
    <View style={styles.wrap}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(8, insets.top) }]}>
        <FlashLogo size={20} />
        <View style={styles.topBtns}>
          <Pressable
            onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
            style={styles.iconBtn}
          >
            <Ionicons
              name={flash === 'on' ? 'flash' : 'flash-off'}
              size={18}
              color={flash === 'on' ? colors.yellow : colors.white}
            />
          </Pressable>
          <Pressable onPress={cycleTimer} style={styles.iconBtn}>
            <Ionicons
              name="timer-outline"
              size={18}
              color={timerSec > 0 ? colors.yellow : colors.white}
            />
            {timerSec > 0 && (
              <View style={styles.timerBadge}>
                <Text style={styles.timerBadgeText}>{timerSec}s</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Viewfinder */}
      <PinchGestureHandler onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange}>
        <Pressable onPress={onTapFocus} style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            {permission?.granted ? (
              <CameraView
                ref={camRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                flash={flash}
                zoom={zoom}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.permissionWrap]}>
                <Text style={styles.permText}>camera permission required</Text>
                <Pressable style={styles.permBtn} onPress={requestPermission}>
                  <Text style={styles.permBtnText}>grant access</Text>
                </Pressable>
              </View>
            )}

            {/* Filter preview tint (accent hint — full LUT applies on captured photo) */}
            {tint && (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.12 }]}
              />
            )}

            {/* Rule of thirds grid */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {[1, 2].map((i) => (
                <View key={'h' + i} style={[styles.gridLine, { top: `${(i * 100) / 3}%`, left: 0, right: 0, height: 0.5 }]} />
              ))}
              {[1, 2].map((i) => (
                <View key={'v' + i} style={[styles.gridLine, { left: `${(i * 100) / 3}%`, top: 0, bottom: 0, width: 0.5 }]} />
              ))}
            </View>

            {/* Focus ring */}
            {focusPos && (
              <View
                pointerEvents="none"
                style={[
                  styles.focusRing,
                  { left: focusPos.x - 14, top: focusPos.y - 14 },
                ]}
              />
            )}

            {/* Filter badge */}
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{FILTER_LABEL[filter]}</Text>
            </View>

            {/* Daily topic */}
            {dailyTopic && (
              <View style={styles.topicBadge}>
                <Text style={styles.topicText}>today's topic: {dailyTopic.topic}</Text>
              </View>
            )}

            {/* Zoom indicator — always visible; resting lens reads 0.5x */}
            <View style={styles.zoomBadge}>
              <Text style={styles.zoomText}>{(0.5 + zoom * 2).toFixed(1)}x</Text>
            </View>

            {/* Countdown overlay */}
            {countdown > 0 && (
              <View pointerEvents="none" style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
            )}

            {/* White flash overlay */}
            <RNAnimated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: flashOpacity }]}
            />
          </View>
        </Pressable>
      </PinchGestureHandler>

      {/* Filter strip */}
      <FilterStrip selected={filter} onSelect={setFilter} isPro={user?.isPro} />

      {/* Shutter row */}
      <View style={styles.shutterRow}>
        <View style={styles.thumb} />
        <Pressable
          onPress={onShutter}
          disabled={isCapturing}
          style={({ pressed }) => [
            styles.shutter,
            pressed && { transform: [{ scale: 0.94 }] },
            isCapturing && { opacity: 0.6 },
          ]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          style={styles.flipBtn}
        >
          <Ionicons name="camera-reverse-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={styles.redDot} />
        <Text style={styles.footerText}>your pack is waiting · shoot anytime</Text>
      </View>

      {/* 24h lock overlay */}
      {locked && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={40} color={colors.yellow} />
          <Text style={styles.lockTitle}>camera locked</Text>
          <Text style={styles.lockSub}>you already flashed today.{'\n'}next window in {lockTimer}.</Text>
          {canUndo && (
            <Pressable
              onPress={() => {
                if (!lastPostedPhotoId) return;
                Alert.alert(
                  'undo your flash?',
                  "this deletes your photo and removes you from your pack. you'll lose your streak.",
                  [
                    { text: 'cancel', style: 'cancel' },
                    {
                      text: 'undo',
                      style: 'destructive',
                      onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        await revertPhoto(lastPostedPhotoId);
                        refreshPacks();
                      },
                    },
                  ],
                );
              }}
              style={styles.undoBtn}
            >
              <Ionicons name="arrow-undo-outline" size={14} color={colors.yellow} />
              <Text style={styles.undoText}>undo last flash</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  topBar: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.yellow,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadgeText: { color: '#000', fontSize: 9, fontWeight: '700' },
  viewfinderWrap: { flex: 1, paddingHorizontal: 8, paddingVertical: 4 },
  viewfinder: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0d0d0d' },
  permissionWrap: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  permText: { color: colors.textSecondary, fontSize: 12 },
  permBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.yellow,
    borderRadius: 10,
  },
  permBtnText: { color: '#000', fontWeight: '700' },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.08)' },
  focusRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.yellow,
  },
  filterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterBadgeText: { color: colors.white, fontSize: 10 },
  topicBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255,214,10,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.25)',
  },
  topicText: { color: colors.yellow, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  zoomBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  zoomText: { color: colors.white, fontSize: 10, fontWeight: '600' },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  countdownText: { color: colors.white, fontSize: 96, fontWeight: '200' },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  thumb: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  shutter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white },
  flipBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 8 },
  redDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.red },
  footerText: { color: 'rgba(255,255,255,0.35)', fontSize: 9 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 30,
  },
  lockTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  lockSub: { color: colors.textDim, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  undoBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,214,10,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.20)',
  },
  undoText: { color: colors.yellow, fontSize: 12, fontWeight: '700' },
});
