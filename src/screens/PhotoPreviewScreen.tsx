import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../services/haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { filterColor } from '../theme/colors';
import { APIService } from '../services/api';
import { VibeFilter } from '../types/models';
import { FILTER_LABEL } from '../services/filters';
import FilteredImage from '../components/FilteredImage';
import { useAppState } from '../state/AppState';
import { t } from '../services/i18n';
import { useVideoPlayer, VideoView } from 'expo-video';
import { posthog } from '../config/posthog';

type State = 'idle' | 'uploading' | 'success';
const SQUAD_WINDOW_MS = 18 * 3600 * 1000;
const DUET_WINDOW_MS = 4 * 3600 * 1000;

function modeTimeLeft(lastPostAt: string | null, windowMs: number): string {
  if (!lastPostAt) return '';
  const remaining = windowMs - (Date.now() - new Date(lastPostAt).getTime());
  if (remaining <= 0) return '';
  const hours = Math.floor(remaining / 3600_000);
  const minutes = Math.floor((remaining % 3600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function LivePreview({ videoUri }: { videoUri: string }) {
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function PhotoPreviewScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const uri: string = route.params?.uri;
  const videoUri: string | undefined = route.params?.videoUri;
  const filter: VibeFilter = route.params?.filter ?? 'raw';
  const {
    markFirstPackPosted,
    token,
    revertPhoto,
    lastSquadPostAt,
    lastDuetPostAt,
    setLastPostAt,
    setLastSquadPostAt,
    setLastDuetPostAt,
    setLastPostedPackType,
    setLastPostedPhotoId,
    refreshPacks,
  } = useAppState();
  const insets = useSafeAreaInsets();
  const squadTimeLeft = modeTimeLeft(lastSquadPostAt, SQUAD_WINDOW_MS);
  const duetTimeLeft = modeTimeLeft(lastDuetPostAt, DUET_WINDOW_MS);
  const squadLocked = !!squadTimeLeft;
  const duetLocked = !!duetTimeLeft;

  const [state, setState] = useState<State>('idle');
  const [duet, setDuet] = useState(squadLocked && !duetLocked);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const width = useSharedValue(220);
  const radius = useSharedValue(12);

  const animateSendButton = (nextState: State) => {
    const ease = Easing.bezier(0.4, 0, 0.2, 1);
    if (nextState === 'idle') {
      width.value = withTiming(220, { duration: 260, easing: ease });
      radius.value = withTiming(12, { duration: 260, easing: ease });
    } else {
      width.value = withTiming(56, { duration: 260, easing: ease });
      radius.value = withTiming(28, { duration: 260, easing: ease });
    }
  };

  const sendStyle = useAnimatedStyle(() => ({
    width: width.value,
    borderRadius: radius.value,
  }));

  const canRevert = sentAt !== null && Date.now() - sentAt < 2 * 3600 * 1000;

  const onSend = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!token) {
      Alert.alert(t('uploadFailedTitle'), t('uploadFailedAuth'));
      return;
    }
    if ((duet && duetLocked) || (!duet && squadLocked)) {
      Alert.alert(t('modeLockedTitle'), t('modeLockedSub', { time: duet ? duetTimeLeft : squadTimeLeft }));
      return;
    }
    animateSendButton('uploading');
    setState('uploading');
    try {
      const res = await APIService.uploadPhoto(token, uri, filter, videoUri, duet ? 'duet' : 'squad');
      setPhotoId(res.photoId);
      setLastPostedPhotoId(res.photoId);
      const nowIso = new Date().toISOString();
      setSentAt(Date.now());
      setLastPostAt(nowIso);
      if (duet) setLastDuetPostAt(nowIso);
      else setLastSquadPostAt(nowIso);
      setLastPostedPackType(duet ? 'duet' : 'squad');
      markFirstPackPosted();
      refreshPacks();
      posthog.capture('photo_sent', {
        filter,
        is_live: !!videoUri,
        mode: duet ? 'duet' : 'squad',
      });
      setState('success');
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        nav.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      }, 500);
    } catch (e: any) {
      console.error('[PhotoPreview] upload failed:', e);
      animateSendButton('idle');
      setState('idle');
      if (e?.status === 422) {
        const code = e?.body?.error;
        if (code === 'image_too_dark') {
          Alert.alert(t('tooDarkToShare'), t('tooDarkToShareSub'));
        } else if (code === 'image_blank') {
          Alert.alert(t('blankImage'), t('blankImageSub'));
        } else {
          Alert.alert(t('moderatedImage'), t('moderatedImageSub'));
        }
      } else if (e?.status === 401) {
        Alert.alert(t('uploadFailedTitle'), t('uploadFailedAuth'));
      } else if (e?.status === 403 && e?.body?.error === 'user_banned') {
        Alert.alert(t('uploadFailedTitle'), t('uploadFailedBanned'));
      } else if (e?.status === 413) {
        Alert.alert(t('uploadFailedTitle'), t('uploadFailedTooLarge'));
      } else if (e?.status === 429 && e?.body?.error === 'pack_mode_locked') {
        Alert.alert(t('modeLockedTitle'), t('modeLockedServerSub'));
      } else if (e?.status >= 500) {
        Alert.alert(t('uploadFailedTitle'), t('uploadFailedServer'));
      } else {
        Alert.alert(t('uploadFailedTitle'), t('uploadFailedGeneric'));
      }
    }
  };

  const onRevert = async () => {
    if (!photoId) return;
    Alert.alert(
      t('revertYourFlash'),
      t('revertYourFlashSub'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('revert'),
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            posthog.capture('photo_reverted', { filter });
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
        {videoUri ? (
          <LivePreview videoUri={videoUri} />
        ) : uri ? (
          <FilteredImage source={{ uri }} filter={filter} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
        <View style={styles.filterBadge}>
          <View style={[styles.filterDot, { backgroundColor: filterColor[filter] }]} />
          <Text style={styles.filterBadgeText}>{FILTER_LABEL[filter]}</Text>
        </View>
        {videoUri ? (
          <View style={styles.liveBadge}>
            <Ionicons name="flash" size={9} color="#000" />
            <Text style={styles.liveBadgeText}>flash.live</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        <Text style={styles.modeHeading}>{t('choosePackMode')}</Text>
        <View style={styles.modeSelector}>
          {([
            {
              key: 'squad',
              title: t('squadModeLabel'),
              detail: t('squadModeExplainer'),
              icon: 'grid-outline' as const,
            },
            {
              key: 'duet',
              title: t('duetModeLabel'),
              detail: t('duetModeExplainer'),
              icon: 'people-outline' as const,
            },
          ]).map((option) => {
            const selected = duet ? option.key === 'duet' : option.key === 'squad';
            const isDuetOption = option.key === 'duet';
            const locked = isDuetOption ? duetLocked : squadLocked;
            const timeLeft = isDuetOption ? duetTimeLeft : squadTimeLeft;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: locked }}
                accessibilityLabel={`${option.title}. ${option.detail}`}
                onPress={() => {
                  if (selected || locked) return;
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDuet(isDuetOption);
                }}
                disabled={locked}
                style={[styles.modeCard, selected && styles.modeCardSelected, locked && styles.modeCardLocked]}
              >
                <View style={styles.modeCardTop}>
                  <View style={[styles.modeIcon, selected && styles.modeIconSelected]}>
                    <Ionicons name={option.icon} size={16} color={selected ? '#000' : colors.textSecondary} />
                  </View>
                  <View style={[styles.layoutPreview, isDuetOption ? styles.duetPreview : styles.squadPreview]}>
                    {Array.from({ length: isDuetOption ? 2 : 4 }).map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.previewTile,
                          isDuetOption ? styles.duetPreviewTile : styles.squadPreviewTile,
                          selected && styles.previewTileSelected,
                        ]}
                      />
                    ))}
                  </View>
                </View>
                <Text style={[styles.modeTitle, selected && styles.modeTitleSelected]}>{option.title}</Text>
                <Text style={styles.modeDetail}>{option.detail}</Text>
                {locked ? (
                  <View style={styles.modeLockedRow}>
                    <Ionicons name="lock-closed" size={9} color={colors.textFade} />
                    <Text style={styles.modeLockedText}>{t('modeAvailableIn', { time: timeLeft })}</Text>
                  </View>
                ) : null}
                {selected ? (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark" size={10} color="#000" />
                    <Text style={styles.selectedBadgeText}>{t('selectedMode')}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <Pressable
            onPress={() => nav.goBack()}
            style={[styles.retake]}
          >
            <Ionicons name="arrow-back" size={14} color={colors.white} />
            <Text style={styles.retakeText}>{t('retake')}</Text>
          </Pressable>

          <Animated.View style={[styles.sendWrap, sendStyle]}>
            <Pressable onPress={state === 'idle' ? onSend : undefined} style={styles.sendInner}>
              {state === 'uploading' ? (
                <ActivityIndicator color="#000" />
              ) : state === 'success' ? (
                <Ionicons name="checkmark" size={20} color="#000" />
              ) : (
                <>
                  <Text style={styles.sendLabel}>{t('send')}</Text>
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
            <Text style={styles.revertText}>{t('revertWithinTwoHours')}</Text>
          </Pressable>
        )}

        <Text style={styles.hint}>{t('savedToVibeHint')}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
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
  modeHeading: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  modeCard: {
    flex: 1,
    minHeight: 112,
    padding: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  modeCardSelected: {
    backgroundColor: 'rgba(255,214,10,0.12)',
    borderColor: colors.yellow,
  },
  modeCardLocked: { opacity: 0.45 },
  modeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  modeIconSelected: { backgroundColor: colors.yellow },
  layoutPreview: {
    width: 36,
    height: 28,
    gap: 2,
  },
  squadPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  duetPreview: { flexDirection: 'row' },
  previewTile: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
  },
  squadPreviewTile: { width: 17, height: 13 },
  duetPreviewTile: { width: 17, height: 28 },
  previewTileSelected: { backgroundColor: colors.yellow },
  modeTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  modeTitleSelected: { color: colors.white },
  modeDetail: {
    color: colors.textDim,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2,
    paddingRight: 2,
  },
  modeLockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
  },
  modeLockedText: { color: colors.textFade, fontSize: 8, fontWeight: '600' },
  selectedBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: colors.yellow,
  },
  selectedBadgeText: { color: '#000', fontSize: 8, fontWeight: '800' },
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
  liveBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.yellow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveBadgeText: { color: '#000', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
});
