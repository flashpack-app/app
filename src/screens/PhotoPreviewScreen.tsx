import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { colors, filterColor } from '../theme/colors';
import { APIService } from '../services/api';
import { ModerationService } from '../services/moderation';
import { VibeFilter } from '../types/models';
import { FILTER_LABEL } from '../services/filters';
import FilteredImage from '../components/FilteredImage';
import { useAppState } from '../state/AppState';

type State = 'idle' | 'uploading' | 'success';

export default function PhotoPreviewScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const uri: string = route.params?.uri;
  const filter: VibeFilter = route.params?.filter ?? 'raw';
  const { markFirstPackPosted, token, revertPhoto, setLastPostAt, setLastPostedPhotoId, refreshPacks } = useAppState();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState<State>('idle');
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const width = useSharedValue(220);
  const radius = useSharedValue(12);

  useEffect(() => {
    const ease = Easing.bezier(0.4, 0, 0.2, 1);
    if (state === 'idle') {
      width.value = withTiming(220, { duration: 260, easing: ease });
      radius.value = withTiming(12, { duration: 260, easing: ease });
    } else {
      width.value = withTiming(56, { duration: 260, easing: ease });
      radius.value = withTiming(28, { duration: 260, easing: ease });
    }
  }, [state]);

  const sendStyle = useAnimatedStyle(() => ({
    width: width.value,
    borderRadius: radius.value,
  }));

  const canRevert = sentAt !== null && Date.now() - sentAt < 2 * 3600 * 1000;

  const onSend = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const safe = await ModerationService.isImageSafe(uri);
    if (!safe) {
      setState('idle');
      return;
    }
    setState('uploading');
    try {
      const res = await APIService.uploadPhoto(token!, uri, filter);
      setPhotoId(res.photoId);
      setLastPostedPhotoId(res.photoId);
      const nowIso = new Date().toISOString();
      setSentAt(Date.now());
      setLastPostAt(nowIso);
      markFirstPackPosted();
      refreshPacks();
      setState('success');
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      }, 500);
    } catch {
      setState('idle');
    }
  };

  const onRevert = async () => {
    if (!photoId) return;
    Alert.alert(
      'revert your flash?',
      "this deletes your photo and removes you from your pack. you'll lose your streak.",
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'revert',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await revertPhoto(photoId);
            nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.imageWrap, { paddingTop: insets.top }]}>
        {uri ? (
          <FilteredImage source={{ uri }} filter={filter} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={styles.filterBadge}>
          <View style={[styles.filterDot, { backgroundColor: filterColor[filter] }]} />
          <Text style={styles.filterBadgeText}>{FILTER_LABEL[filter]}</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.caption}>looks good? send it to your pack.</Text>

        <View style={styles.row}>
          <Pressable
            onPress={() => nav.goBack()}
            style={[styles.retake]}
          >
            <Ionicons name="arrow-back" size={14} color={colors.white} />
            <Text style={styles.retakeText}>retake</Text>
          </Pressable>

          <Animated.View style={[styles.sendWrap, sendStyle]}>
            <Pressable onPress={state === 'idle' ? onSend : undefined} style={styles.sendInner}>
              {state === 'uploading' ? (
                <ActivityIndicator color="#000" />
              ) : state === 'success' ? (
                <Ionicons name="checkmark" size={20} color="#000" />
              ) : (
                <>
                  <Text style={styles.sendLabel}>send</Text>
                  <View style={styles.sendCircle}>
                    <Ionicons name="arrow-up" size={14} color="#000" />
                  </View>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {state === 'success' && canRevert && (
          <Pressable onPress={onRevert} style={styles.revertBtn}>
            <Ionicons name="refresh" size={12} color={colors.red} />
            <Text style={styles.revertText}>revert within 2h</Text>
          </Pressable>
        )}

        <Text style={styles.hint}>your filter is saved to your vibe profile</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  imageWrap: { flex: 1, backgroundColor: '#111' },
  filterBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterBadgeText: { color: colors.white, fontSize: 10 },
  bottom: { padding: 16, gap: 10 },
  caption: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  retake: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  retakeText: { color: colors.white, fontWeight: '600' },
  sendWrap: {
    height: 44,
    backgroundColor: colors.yellow,
    overflow: 'hidden',
  },
  sendInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  sendLabel: { color: '#000', fontWeight: '700', fontSize: 14 },
  sendCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFEB6E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { color: 'rgba(255,255,255,0.15)', fontSize: 9, textAlign: 'center' },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,69,58,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,69,58,0.15)',
  },
  revertText: { color: colors.red, fontSize: 11, fontWeight: '600' },
});
