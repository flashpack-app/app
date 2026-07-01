import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Text,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from '../services/haptics';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { useAccessibility } from '../services/AccessibilityContext';
import { API_URL } from '../config';
import StatusPill from '../components/StatusPill';
import Mosaic from '../components/Mosaic';
import ChemistryBar from '../components/ChemistryBar';
import ChemistryBreakdown from '../components/ChemistryBreakdown';
import PillButton from '../components/PillButton';
import ReactionStack from '../components/ReactionStack';
import FilteredImage from '../components/FilteredImage';
import { Image } from 'expo-image';
import ScaledText from '../components/ScaledText';
import { normalizeFilter } from '../services/filters';
import ScreenshotWarningModal from './ScreenshotWarningModal';
import { useScreenshotDetector, usePreventCapture } from '../services/screenshot';
import FloatingReactions, { triggerFloatingReaction } from '../components/FloatingReactions';
import { ModerationService } from '../services/moderation';
import FlashLogo from '../components/FlashLogo';
import LiquidRefresh from '../components/LiquidRefresh';
import { useVideoPlayer, VideoView } from 'expo-video';

const GHOST_EMOJIS = ['👻', '🔥', '❤️', '😂', '😮'];

function resolveUrl(u?: string): string | undefined {
  if (!u) return undefined;
  if (u.startsWith('http') || u.startsWith('data:')) return u;
  return `${API_URL}${u}`;
}
const { width: SCREEN_W } = Dimensions.get('window');
const TILE_GAP = 3;
const TILE_SIZE = (SCREEN_W - 24 - TILE_GAP) / 2;

/* Shade-in wrapper for grid tiles */
function ShadeInTile({
  ready,
  index,
  children,
  style,
}: {
  ready: ReturnType<typeof useSharedValue<number>>;
  index: number;
  children: React.ReactNode;
  style: any;
}) {
  const start = 0.12 + index * 0.08;
  const shadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ready.value, [start, start + 0.22], [0, 1], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[style, shadeStyle]}>{children}</Animated.View>;
}

/* Silent looping flash.live video tile */
function LiveTile({ videoURL, style }: { videoURL: string; style?: any }) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const player = useVideoPlayer(videoURL, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // play() before load is a no-op on network URLs (AVPlayer ignores it).
  // Fire play() the moment the player signals it's readyToPlay.
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
      contentFit="cover"
      nativeControls={false}
      surfaceType="textureView"
    />
  );
}

function useCountdown(target: Date | null): string {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    if (!target) { setTxt(''); return; }
    const tick = () => {
      const ms = target.getTime() - Date.now();
      if (ms <= 0) { setTxt('expired'); return; }
      const m = Math.floor(ms / 60_000);
      const h = Math.floor(m / 60);
      setTxt(`${h}h ${m % 60}m`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [target]);
  return txt;
}

export default function PackRevealScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { packs, discoverPacks, reactions, addReaction, addComment, user, comments, token, dailyTopic, refreshPacks, refreshDiscover } = useAppState();
  const { reduceMotion, minimizeAnimations } = useAccessibility();
  const id = route.params?.packId ?? packs[0]?.id;
  const pack = packs.find((p) => p.id === id) ?? discoverPacks.find((p) => p.id === id) ?? packs[0];
  const [warn, setWarn] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showChem, setShowChem] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasDailyTopic = !!dailyTopic && dailyTopic.date === new Date().toISOString().slice(0, 10);
  const storyRef = useRef<View>(null);
  const triggeredRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const progress = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const onSharePack = async () => {
    if (!pack) return;
    try {
      setSharing(true);
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
      setSharing(false);
    }
  };

  const isMember = !!pack && pack.members.some((m) => m.userId === user?.id);
  // Discover ("around the globe") packs are someone else's — block screenshots entirely.
  usePreventCapture(!!pack && !isMember);
  useScreenshotDetector(token, pack?.id, () => setWarn(true));
  const timeLeft = useCountdown(pack?.expiresAt ? new Date(pack.expiresAt) : null);

  const onRefresh = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await Promise.all([refreshPacks(), refreshDiscover()]);
    setRefreshing(false);
    triggeredRef.current = false;
    progress.value = 0;
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, [refreshPacks, refreshDiscover]);

  if (!pack) return (
    <View style={[styles.wrap, { justifyContent: 'center', alignItems: 'center' }]}>
      <Pressable onPress={() => nav.goBack()} style={{ position: 'absolute', top: Math.max(12, insets.top), left: 12, padding: 8 }}>
        <Ionicons name="chevron-back" size={22} color={colors.white} />
      </Pressable>
      <Ionicons name="layers-outline" size={40} color={colors.textFade} />
      <ScaledText style={{ color: colors.textFade, marginTop: 12, fontSize: 14 }}>pack not found</ScaledText>
    </View>
  );

  // ── reveal animation ──
  const ready = useSharedValue(0);
  useEffect(() => {
    const duration = reduceMotion || minimizeAnimations ? 0 : 1100;
    ready.value = withDelay(80, withTiming(1, { duration }));
  }, []);

  const topStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ready.value, [0, 0.25], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(ready.value, [0, 0.3], [-30, 0], Extrapolation.CLAMP) },
      { scale: interpolate(ready.value, [0, 0.3, 0.5], [0.85, 1.03, 1], Extrapolation.CLAMP) },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ready.value, [0.05, 0.3], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(ready.value, [0.05, 0.35], [-25, 0], Extrapolation.CLAMP) },
    ],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ready.value, [0.15, 0.4], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(ready.value, [0.15, 0.4], [15, 0], Extrapolation.CLAMP) },
    ],
  }));

  const chemStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ready.value, [0.45, 0.75], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(ready.value, [0.45, 0.8], [50, 0], Extrapolation.CLAMP) },
      { scale: interpolate(ready.value, [0.45, 0.65, 0.85], [0.85, 1.04, 1], Extrapolation.CLAMP) },
    ],
  }));

  const actionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ready.value, [0.55, 0.85], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(ready.value, [0.55, 0.75, 0.95], [0.85, 1.04, 1], Extrapolation.CLAMP) },
    ],
  }));

  const commentsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ready.value, [0.65, 0.95], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(ready.value, [0.65, 0.95], [40, 0], Extrapolation.CLAMP) },
    ],
  }));

  const isExpired = pack.status === 'expired' || new Date(pack.expiresAt).getTime() <= Date.now();
  if (isExpired && !user?.isPro) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
          <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <ScaledText style={styles.headerTitle}>pack</ScaledText>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.expiredLock}>
          <Ionicons name="lock-closed" size={36} color={colors.yellow} />
          <ScaledText style={styles.expiredTitle}>this pack has expired</ScaledText>
          <ScaledText style={styles.expiredSub}>
            flashes vanish after they expire. upgrade to flash. pro to keep your packs in your vault forever.
          </ScaledText>
          <Pressable onPress={() => nav.navigate('Pro')} style={styles.expiredBtn}>
            <Ionicons name="flash" size={14} color="#000" />
            <ScaledText style={styles.expiredBtnText}>upgrade to pro</ScaledText>
          </Pressable>
        </View>
      </View>
    );
  }

  const packReactions = reactions[pack.id] ?? [];
  const userReacted = packReactions.some((r) => r.userId === user?.id);
  const canReact = packReactions.length < 5 && !userReacted;

  const onReact = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addReaction(pack.id, emoji);
    setShowEmojiPicker(false);
    triggerFloatingReaction(emoji);
  };

  const packComments = comments[pack.id] ?? [];
  const allPosted = pack.members.every((m) => m.hasPosted);
  const userCommented = packComments.some((c) => c.userId === user?.id);

  const onSendComment = async () => {
    if (!draft.trim()) return;
    if (!ModerationService.isTextSafe(draft)) {
      Alert.alert("this message can't be sent.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const msg = {
      id: 'c-' + Date.now(),
      userId: user?.id ?? 'anon',
      username: user?.username ?? 'anon',
      flag: user?.flag ?? '🌍',
      city: user?.city ?? 'unknown',
      text: draft.trim(),
      sentAt: new Date().toISOString(),
      avatarUrl: user?.avatarUrl,
    };
    addComment(pack.id, msg);
    setDraft('');
  };

  const photos = pack.photos.slice(0, 4);
  const memberOf = (uid: string) => pack.members.find((m) => m.userId === uid);

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 12 }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          if (y < 0 && !triggeredRef.current) {
            progress.value = Math.min(Math.abs(y) / 70, 1);
            if (y < -70) {
              onRefresh();
            }
          }
        }}
        onScrollEndDrag={() => {
          progress.value = 0;
        }}
      >
        <LiquidRefresh progress={progress} />
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
          <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <ScaledText style={styles.headerTitle}>pack</ScaledText>
          <View style={{ width: 32 }} />
        </View>

        <Animated.View style={[styles.top, { paddingTop: 6 }, topStyle]}>
          <View style={styles.topRow}>
            <StatusPill label={`pack #${pack.number} · ${pack.members.length} people`} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {timeLeft ? (
                <View style={styles.timerBadge}>
                  <Ionicons name="time-outline" size={11} color={colors.red} />
                  <ScaledText style={styles.timerText}>{timeLeft} left</ScaledText>
                </View>
              ) : null}
              <Pressable
                onPress={() => nav.navigate('Report', { packId: pack.id })}
                style={styles.reportBtn}
                hitSlop={8}
              >
                <Ionicons name="flag-outline" size={13} color={colors.textFade} />
              </Pressable>
            </View>
          </View>
          <Animated.Text style={[styles.title, titleStyle]}>your pack{'\n'}is here.</Animated.Text>
          <Animated.Text style={[styles.subtitle, subtitleStyle]}>
            shot {pack.apartMinutes} min apart · {pack.countriesCount} countries
          </Animated.Text>
          {pack.screenshots && pack.screenshots.length > 0 && (
            <Animated.View style={[styles.screenshotBadge, subtitleStyle]}>
              <Ionicons name="copy-outline" size={12} color={colors.red} />
              <ScaledText style={styles.screenshotText}>
                {pack.screenshots.length === 1
                  ? `@${pack.screenshots[0].username} screenshotted this pack`
                  : `${pack.screenshots.length} people screenshotted this pack`}
              </ScaledText>
            </Animated.View>
          )}
        </Animated.View>

        {/* Photo grid — staggered shade-in */}
        <View style={[styles.grid, { gap: TILE_GAP, paddingHorizontal: 12 }]}>
          {photos.map((p, i) => {
            const member = memberOf(p.userId);
            const isSelf = p.userId === user?.id;
            const isPro = !!member?.isPro;
            const proBorderColor = member?.proBorder || colors.yellow;
            return (
              <ShadeInTile
                key={p.id}
                ready={ready}
                index={i}
                style={[
                  styles.tile,
                  isSelf && styles.tileSelf,
                  isPro && { borderWidth: 2.5, borderColor: proBorderColor },
                ]}
              >
                <Pressable
                  onPress={() => nav.navigate('PhotoViewer', { packId: pack.id, photoId: p.id })}
                  style={StyleSheet.absoluteFill}
                >
                  {/* flash.live: silent looping video */}
                  {p.videoURL ? (
                    <LiveTile videoURL={resolveUrl(p.videoURL)!} />
                  ) : p.imageURL ? (
                    <FilteredImage
                      source={{ uri: resolveUrl(p.imageURL)! }}
                      filter={normalizeFilter(p.filter)}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: p.placeholder?.[0] ?? '#222' }]} />
                  )}
                  {/* flash.live badge */}
                  {p.videoURL && (
                    <View style={styles.tileLiveBadge}>
                      <Ionicons name="flash" size={8} color="#000" />
                      <ScaledText style={styles.tileLiveText}>flash.live</ScaledText>
                    </View>
                  )}
                  {member && (
                    <View style={styles.tileFlag}>
                      <ScaledText style={{ fontSize: 16 }}>{member.flag}</ScaledText>
                    </View>
                  )}
                  {isSelf && (
                    <View style={styles.tileYouBadge}>
                      <ScaledText style={styles.tileYouText}>you</ScaledText>
                    </View>
                  )}
                  {isPro && (
                    <View style={[styles.tileProBadge, { backgroundColor: proBorderColor }]}>
                      <Ionicons name="flash" size={8} color="#000" />
                    </View>
                  )}
                </Pressable>
              </ShadeInTile>
            );
          })}
        </View>

        {/* Chemistry bar */}
        <Animated.View style={[styles.chemWrap, chemStyle]}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setShowChem(true);
            }}
          >
            <ChemistryBar score={pack.chemistryScore} />
            <View style={styles.chemHint}>
              <Ionicons name="information-circle-outline" size={11} color={colors.textFade} />
              <ScaledText style={styles.chemHintText}>tap to see why</ScaledText>
            </View>
          </Pressable>
        </Animated.View>

        {/* Actions: react + share */}
        <Animated.View style={[styles.actions, actionsStyle]}>
          {showEmojiPicker ? (
            <View style={styles.emojiPicker}>
              {GHOST_EMOJIS.map((e) => (
                <Pressable key={e} onPress={() => onReact(e)} style={styles.emojiBtn}>
                  <ScaledText style={{ fontSize: 22 }}>{e}</ScaledText>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowEmojiPicker(false)} style={styles.emojiBtn}>
                <Ionicons name="close" size={18} color={colors.textFade} />
              </Pressable>
            </View>
          ) : (
            <PillButton
              variant="dim"
              label={canReact ? 'react' : 'max reached'}
              style={{ flex: 1, height: 38 }}
              onPress={() => canReact && setShowEmojiPicker(true)}
            >
              <Ionicons
                name="happy-outline"
                size={14}
                color={canReact ? colors.white : colors.textFade}
              />
            </PillButton>
          )}
          {isMember && (
            <PillButton
              variant="white"
              label={sharing ? 'rendering…' : 'share'}
              style={{ flex: 1, height: 38 }}
              onPress={onSharePack}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="share-outline" size={14} color="#000" />
              )}
            </PillButton>
          )}
        </Animated.View>

        {/* Reaction stack */}
        {packReactions.length > 0 && (
          <View style={styles.reactionsWrap}>
            <ReactionStack reactions={packReactions} maxBubbles={4} />
          </View>
        )}

        {/* Inline comments */}
        <Animated.View style={[styles.commentsSection, commentsStyle]}>
          <View style={styles.commentsHeader}>
            <ScaledText style={styles.commentsLabel}>
              comments{packComments.length > 0 ? ` · ${packComments.length}` : ''}
            </ScaledText>
          </View>

          {isMember && !allPosted && (
            <View style={styles.lockBanner}>
              <Ionicons name="lock-closed" size={12} color={colors.textFade} />
              <ScaledText style={styles.lockText}>opens when all {pack.members.length} have posted</ScaledText>
            </View>
          )}

          {!isMember && (
            <View style={styles.lockBanner}>
              <Ionicons name="lock-closed" size={12} color={colors.textFade} />
              <ScaledText style={styles.lockText}>only pack members can comment</ScaledText>
            </View>
          )}

          {packComments.slice(0, 4).map((c) => {
            const isSelf = c.userId === user?.id;
            const member = pack.members.find((m) => m.userId === c.userId);
            const username = member?.username ?? c.username ?? 'anon';
            const avatarUrl = member?.avatarUrl ?? c.avatarUrl;
            const avatarColor = member?.avatarColor ?? colors.yellow;
            const initials = member?.initials ?? (username ? username.slice(0, 2).toUpperCase() : '??');
            
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  if (isSelf) {
                    nav.navigate('Tabs', { screen: 'Profile' });
                  } else {
                    nav.push('PublicProfile', { username });
                  }
                }}
                style={[
                  styles.commentCard,
                  isSelf && styles.youCard,
                ]}
              >
                <View style={styles.commentHeaderRow}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.commentAvatar as any} />
                  ) : (
                    <View style={[styles.commentInitialsBg, { backgroundColor: avatarColor }]}>
                      <ScaledText style={styles.commentInitialsText}>{initials}</ScaledText>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentMetaRow}>
                      <ScaledText style={styles.commentUsername}>@{username}</ScaledText>
                      <ScaledText style={isSelf ? styles.metaYou : styles.meta}>
                        {c.flag} {c.city} · {Math.max(1, Math.floor((Date.now() - new Date(c.sentAt).getTime()) / 60000))}m ago
                        {isSelf && ' · you'}
                      </ScaledText>
                    </View>
                    <ScaledText style={styles.commentText}>{c.text}</ScaledText>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {isMember && !userCommented && allPosted && (
            <View style={styles.youCard}>
              <ScaledText style={styles.metaYou}>{user?.flag ?? '🌍'} you · write once, locked forever</ScaledText>
              <Pressable
                onPress={() => setShowCommentModal(true)}
                style={styles.inputPlaceholderRow}
              >
                <ScaledText style={styles.inputPlaceholderText}>say something...</ScaledText>
                <View style={styles.sendBtnPlaceholder}>
                  <Ionicons name="chatbubble-outline" size={12} color="rgba(255,255,255,0.4)" />
                </View>
              </Pressable>
            </View>
          )}

          {/* Premium Bottom Sheet-style Comment Input Modal */}
          <Modal
            visible={showCommentModal}
            animationType="slide"
            transparent
            statusBarTranslucent
            onRequestClose={() => setShowCommentModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalBackdrop}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPressIn={() => {
                  Keyboard.dismiss();
                  setShowCommentModal(false);
                }}
              />
              <View style={[styles.modalContainer, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleRow}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.yellow} />
                    <ScaledText style={styles.modalTitle}>add comment</ScaledText>
                  </View>
                  <Pressable
                    onPressIn={() => {
                      Keyboard.dismiss();
                      setShowCommentModal(false);
                    }}
                    style={styles.modalCloseBtn}
                    hitSlop={12}
                  >
                    <Ionicons name="close" size={18} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                </View>
                
                <ScaledText style={styles.modalHint}>
                  you are commenting as <Text style={styles.modalUserHighlight}>@{user?.username}</Text> · write once, locked forever
                </ScaledText>

                <View style={styles.modalInputRow}>
                  <TextInput
                    autoFocus
                    placeholder="say something..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={styles.modalInput}
                    value={draft}
                    onChangeText={setDraft}
                    maxLength={200}
                    returnKeyType="send"
                    blurOnSubmit={true}
                    onSubmitEditing={() => {
                      if (draft.trim()) {
                        onSendComment();
                        setShowCommentModal(false);
                      }
                    }}
                  />
                  <Pressable
                    disabled={!draft.trim()}
                    onPress={() => {
                      onSendComment();
                      setShowCommentModal(false);
                    }}
                    style={[styles.modalSendBtn, !draft.trim() && { opacity: 0.35 }]}
                  >
                    <Ionicons name="arrow-up" size={15} color="#000" />
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {userCommented && (
            <View style={[styles.lockBanner, { marginTop: 6 }]}>
              <Ionicons name="lock-closed" size={12} color={colors.textFade} />
              <ScaledText style={styles.lockText}>your comment is locked forever</ScaledText>
            </View>
          )}
        </Animated.View>

        <ScreenshotWarningModal visible={warn} onClose={() => setWarn(false)} membersCount={pack.members.length} />

        <ChemistryBreakdown
          visible={showChem}
          pack={pack}
          hasDailyTopic={hasDailyTopic}
          onClose={() => setShowChem(false)}
        />

        <FloatingReactions />

        {/* Off-screen 1080x1920 story render target */}
        <View ref={storyRef} collapsable={false} style={styles.storyHidden} pointerEvents="none">
          <View style={styles.storyInner}>
            <View>
              {/* Logo row */}
              <View style={styles.storyLogoRow}>
                <FlashLogo size={96} />
              </View>
              {/* Tagline */}
              <ScaledText style={styles.storyTagline}>
                {pack.members.length} people · {pack.countriesCount} {pack.countriesCount === 1 ? 'country' : 'countries'}
              </ScaledText>
              {/* Country flags */}
              <View style={styles.storyFlagsRow}>
                {Array.from(new Set(pack.members.map((m) => m.flag).filter(Boolean))).slice(0, 8).map((flag, i) => (
                  <ScaledText key={i} style={styles.storyFlag}>{flag}</ScaledText>
                ))}
              </View>
            </View>
            <View style={styles.storyMosaic}>
              <Mosaic pack={pack} height={960} borderRadius={32} cellGap={6} showFlags animateOnMount={false} />
            </View>
            <View style={styles.storyFooter}>
              <ScaledText style={styles.storyChem}>{pack.chemistryScore}% match</ScaledText>
              <ScaledText style={styles.storyNum}>pack #{pack.number}</ScaledText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Custom bottom nav */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Feed' })} style={styles.navItem}>
          <Ionicons name="grid" size={22} color={colors.yellow} />         
        </Pressable>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Camera' })} style={styles.navItem}>
          <Ionicons name="camera-outline" size={22} color="rgba(255,255,255,0.35)" />
        </Pressable>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Profile' })} style={styles.navItem}>
          <Ionicons name="person-outline" size={22} color="rgba(255,255,255,0.35)" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  expiredLock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  expiredTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  expiredSub: { color: colors.textDim, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 300 },
  expiredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 6,
  },
  expiredBtnText: { color: '#000', fontSize: 13, fontWeight: '700' },
  top: { paddingHorizontal: 14, paddingBottom: 8, gap: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,69,58,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,69,58,0.25)',
  },
  timerText: { color: colors.red, fontSize: 10, fontWeight: '700' },
  reportBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -0.6, lineHeight: 32 },
  subtitle: { color: colors.textDim, fontSize: 11 },
  screenshotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,69,58,0.10)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  screenshotText: { color: colors.red, fontSize: 10, fontWeight: '600' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: TILE_GAP,
  },
  tileSelf: {
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  tileFlag: { position: 'absolute', bottom: 6, left: 6 },
  tileYouBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.yellow,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tileYouText: { color: '#000', fontWeight: '700', fontSize: 8 },
  tileProBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: 999,
    paddingHorizontal: 3,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLiveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.yellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tileLiveText: { color: '#000', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  chemWrap: { paddingHorizontal: 14, paddingTop: 14 },
  chemHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  chemHintText: { color: colors.textFade, fontSize: 10 },
  actions: { flexDirection: 'row', gap: 8, padding: 12 },
  emojiPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 38,
  },
  emojiBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionsWrap: { paddingHorizontal: 14, paddingTop: 6 },
  commentsSection: { marginHorizontal: 12, marginTop: 8, gap: 8 },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentsLabel: {
    color: colors.textDim,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  lockText: { color: colors.textFade, fontSize: 10 },
  commentCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  youCard: {
    backgroundColor: 'rgba(255,214,10,0.05)',
    borderColor: 'rgba(255,214,10,0.15)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  meta: { color: colors.textFade, fontSize: 9 },
  metaYou: { color: 'rgba(255,214,10,0.45)', fontSize: 9 },
  commentText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 17 },
  commentHeaderRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
  },
  commentInitialsBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentInitialsText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  commentUsername: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 32,
    maxHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: colors.white,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    fontSize: 12,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputPlaceholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 34,
    marginTop: 4,
  },
  inputPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  sendBtnPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: '#222',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    marginBottom: 16,
  },
  modalUserHighlight: {
    color: colors.yellow,
    fontWeight: '600',
  },
  modalInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalInput: {
    flex: 1,
    minHeight: 34,
    maxHeight: 110,
    color: '#FFF',
    fontSize: 13,
    paddingTop: 4,
    paddingBottom: 4,
  },
  modalSendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0A0A0A',
    paddingTop: 8,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4 },
  navLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '600' },
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
  storyLogoRow: { flexDirection: 'row', alignItems: 'center' },
  storyTagline: { color: colors.textDim, fontSize: 28, fontWeight: '500', marginTop: 12 },
  storyFlagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  storyFlag: { fontSize: 40 },
  storyMosaic: { width: 960, height: 960, alignSelf: 'center' },
  storyFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storyChem: { color: colors.yellow, fontSize: 56, fontWeight: '800' },
  storyNum: { color: colors.textDim, fontSize: 36, fontWeight: '600' },
  chemScoreText: {
    color: colors.yellow,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
});
