import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';
import { API_URL } from '../config';
import FilteredImage from '../components/FilteredImage';
import Mosaic from '../components/Mosaic';
import { usePreventCapture } from '../services/screenshot';
import { useVideoPlayer, VideoView } from 'expo-video';

const screenW = Dimensions.get('window').width;
const screenH = Dimensions.get('window').height;

// Component to handle video player initialization for the viewer
function LiveViewer({ videoURL, style }: { videoURL: string; style?: any }) {
  const player = useVideoPlayer(videoURL, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }: any) => {
      if (status === 'readyToPlay') {
        player.loop = true;
        player.play();
      }
    });
    return () => sub.remove();
  }, [player]);

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFillObject, style]}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function PhotoViewerScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { packs, discoverPacks, user } = useAppState();
  const packId: string = route.params?.packId;
  const photoId: string | undefined = route.params?.photoId;
  const pack =
    packs.find((p) => p.id === packId) ?? discoverPacks.find((p) => p.id === packId);
  const isMember = !!pack && pack.members.some((m) => m.userId === user?.id);
  // Block screenshots when viewing someone else's (discover) photo.
  usePreventCapture(!!pack && !isMember);
  const photo = pack?.photos.find((p) => p.id === photoId) ?? pack?.photos[0];
  const imageUrl = photo?.imageURL
    ? photo.imageURL.startsWith('http') || photo.imageURL.startsWith('data:')
      ? photo.imageURL
      : `${API_URL}${photo.imageURL}`
    : undefined;

  const videoUrl = photo?.videoURL
    ? photo.videoURL.startsWith('http')
      ? photo.videoURL
      : `${API_URL}${photo.videoURL}`
    : undefined;
  const member = pack?.members.find((m) => m.userId === photo?.userId);
  const storyRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  // Zoom / pan shared values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  // Focal point of the active pinch (relative to image centre).
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  // Swipe-down-to-dismiss values (only active when not zoomed).
  const dismissY = useSharedValue(0);
  const dismissOpacity = useSharedValue(1);

  const goBack = useCallback(() => nav.goBack(), [nav]);

  // Pinch: zoom anchored at the fingers' focal point, capped 1x–4x.
  const pinch = Gesture.Pinch()
    .onStart((e) => {
      originX.value = e.focalX - screenW / 2;
      originY.value = e.focalY - screenH / 2;
    })
    .onUpdate((e) => {
      const next = Math.min(4, Math.max(1, savedScale.value * e.scale));
      const delta = next / savedScale.value;
      translateX.value = savedTranslateX.value + originX.value * (1 - delta);
      translateY.value = savedTranslateY.value + originY.value * (1 - delta);
      scale.value = next;
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        scale.value = withSpring(1, { damping: 15 });
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      } else {
        const maxX = ((scale.value - 1) * screenW) / 2;
        const maxY = ((scale.value - 1) * screenH) / 2;
        translateX.value = Math.min(maxX, Math.max(-maxX, translateX.value));
        translateY.value = Math.min(maxY, Math.max(-maxY, translateY.value));
      }
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pan: move the zoomed image, or swipe down to dismiss.
  const pan = Gesture.Pan()
    .minDistance(5)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1) {
        const maxX = ((scale.value - 1) * screenW) / 2;
        const maxY = ((scale.value - 1) * screenH) / 2;
        translateX.value = Math.min(maxX, Math.max(-maxX, savedTranslateX.value + e.translationX));
        translateY.value = Math.min(maxY, Math.max(-maxY, savedTranslateY.value + e.translationY));
      } else {
        dismissY.value = Math.max(0, e.translationY);
        dismissOpacity.value = 1 - Math.min(1, dismissY.value / 250);
      }
    })
    .onEnd(() => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else if (dismissY.value > 120) {
        runOnJS(goBack)();
      } else {
        dismissY.value = withSpring(0, { damping: 20 });
        dismissOpacity.value = withSpring(1, { damping: 20 });
      }
    });

  // Double-tap to toggle between fit and 2.5x, zooming toward the tap point.
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const target = 2.5;
        const maxX = ((target - 1) * screenW) / 2;
        const maxY = ((target - 1) * screenH) / 2;
        const tx = Math.min(maxX, Math.max(-maxX, -(e.x - screenW / 2) * (target - 1)));
        const ty = Math.min(maxY, Math.max(-maxY, -(e.y - screenH / 2) * (target - 1)));
        scale.value = withTiming(target);
        translateX.value = withTiming(tx);
        translateY.value = withTiming(ty);
        savedScale.value = target;
        savedTranslateX.value = tx;
        savedTranslateY.value = ty;
      }
    });

  const composedGesture = Gesture.Exclusive(doubleTap, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dismissY.value }],
    opacity: dismissOpacity.value,
  }));

  if (!pack || !photo) {
    return (
      <View style={styles.wrap}>
        <Text style={{ color: colors.white, marginTop: 80, textAlign: 'center' }}>photo not found</Text>
      </View>
    );
  }

  const onShare = async () => {
    try {
      setBusy(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(storyRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: 1920,
      });
      const can = await Sharing.isAvailableAsync();
      if (!can) {
        Alert.alert('share unavailable', 'sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'share to story',
      });
    } catch (e: any) {
      Alert.alert('share failed', e?.message ?? 'unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View style={[styles.wrap, containerStyle]}>
      {/* Top bar */}
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>
          {member?.flag} {member?.username ?? 'flash'}
        </Text>
        <Pressable onPress={onShare} style={styles.iconBtn} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Ionicons name="share-outline" size={22} color={colors.white} />
          )}
        </Pressable>
      </View>

      {/* Full image with pinch zoom, free pan, double-tap & swipe-down */}
      <View style={styles.imageWrap}>
        {videoUrl ? (
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.zoomWrap, imageStyle]}>
              <LiveViewer
                videoURL={videoUrl}
                style={styles.fullImg}
              />
            </Animated.View>
          </GestureDetector>
        ) : imageUrl ? (
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.zoomWrap, imageStyle]}>
              <FilteredImage
                source={{ uri: imageUrl }}
                filter={photo.filter}
                style={styles.fullImg}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: photo.placeholder?.[0] ?? '#222' }]} />
        )}
      </View>

      {/* Meta */}
      <View style={[styles.meta, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <Text style={styles.metaCity}>{member?.city ?? 'somewhere'} · {photo.filter}</Text>
        <Text style={styles.metaHint}>swipe down to close · pinch or double-tap to zoom · drag to pan</Text>
      </View>

      {/* Hidden story render target */}
      <View
        ref={storyRef}
        collapsable={false}
        style={styles.storyHidden}
        pointerEvents="none"
      >
        <View style={styles.storyInner}>
          <View style={styles.storyHeader}>
            <Text style={styles.storyBrand}>flash.</Text>
            <Text style={styles.storyTagline}>{pack.members.length} people · {pack.countriesCount} countries</Text>
          </View>
          <View style={styles.storyMosaic}>
            <Mosaic pack={pack} height={1080} borderRadius={32} cellGap={6} showFlags animateOnMount={false} />
          </View>
          <View style={styles.storyFooter}>
            <Text style={styles.storyChem}>{pack.chemistryScore}% match</Text>
            <Text style={styles.storyNum}>pack #{pack.number}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 15, fontWeight: '600' },
  imageWrap: { flex: 1, backgroundColor: '#000' },
  zoomWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fullImg: { width: '100%', height: '100%' },
  meta: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  metaCity: { color: colors.white, fontSize: 14, fontWeight: '600' },
  metaHint: { color: colors.textFade, fontSize: 11 },
  // Off-screen story canvas (1080x1920)
  storyHidden: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 1080,
    height: 1920,
    backgroundColor: '#000',
  },
  storyInner: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 60,
    paddingTop: 200,
    paddingBottom: 200,
    justifyContent: 'space-between',
  },
  storyHeader: { gap: 12 },
  storyBrand: { color: colors.white, fontSize: 84, fontWeight: '900', letterSpacing: -3 },
  storyTagline: { color: colors.textDim, fontSize: 28, fontWeight: '500' },
  storyMosaic: { width: 960, height: 1080, alignSelf: 'center' },
  storyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storyChem: { color: colors.yellow, fontSize: 56, fontWeight: '800' },
  storyNum: { color: colors.textDim, fontSize: 36, fontWeight: '600' },
});
