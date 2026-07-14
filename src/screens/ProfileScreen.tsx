import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from '../services/haptics';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { ALL_FILTERS, FREE_FILTERS, VibeFilter } from '../types/models';
import { APIService } from '../services/api';
import { normalizeFilter } from '../services/filters';
import { useAccessibility } from '../services/AccessibilityContext';
import ScaledText from '../components/ScaledText';
import VibemeterBar from '../components/VibemeterBar';
import CountryChip from '../components/CountryChip';
import CountryMapModal from '../components/CountryMapModal';
import PongGame from '../components/PongGame';
import LiquidRefresh from '../components/LiquidRefresh';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { t } from '../services/i18n';

// ── Streak colour tiers ───────────────────────────────────────────────
function getStreakColor(days: number): { bg: string; glow: string } {
  if (days >= 100) return { bg: '#FF2D2D', glow: 'rgba(255,45,45,0.55)' };
  if (days >= 30)  return { bg: '#FF5E1A', glow: 'rgba(255,94,26,0.55)' };
  if (days >= 14)  return { bg: '#FF7A00', glow: 'rgba(255,122,0,0.5)'  };
  if (days >= 7)   return { bg: '#FF9500', glow: 'rgba(255,149,0,0.45)' };
  return             { bg: '#FFD60A', glow: 'rgba(255,214,10,0.35)' };
}

// ── Animated fire badge ───────────────────────────────────────────────
const StreakBadge: React.FC<{ days: number; onPress?: () => void }> = ({ days, onPress }) => {
  const { bg, glow } = getStreakColor(days);
  const scale = useSharedValue(1);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={streakBadgeStyles.positioner}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(1.18, { damping: 10, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
        onPress={onPress}
        hitSlop={8}
      >
        <Animated.View style={[streakBadgeStyles.badgeInner, { backgroundColor: bg, shadowColor: glow }, badgeStyle]}>
          <Ionicons name="flame" size={9} color="#000" />
          <Text style={streakBadgeStyles.label}>{t('streakDays', { count: days })}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const streakBadgeStyles = StyleSheet.create({
  positioner: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    zIndex: 10,
  },
  badge: {
    // Pressable wrapper — no visual style, just for hit area
  },
  badgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.18)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 6,
  },
  flame: { /* animated wrapper — no style needed */ },
  label: { fontWeight: '700', fontSize: 10, color: '#000' },
});

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { user: me, streak, packs, refreshStreak, refreshPacks, token, updateAvatar } = useAppState();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const targetUsername = route.params?.username as string | undefined;
  const { largerText } = useAccessibility();
  const isOwnProfile = !targetUsername || targetUsername === me?.username;
  const [avatarViewer, setAvatarViewer] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [showPong, setShowPong] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const adminTapCount = useRef(0);
  const adminTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const secretScale = useSharedValue(1);
  const secretRotate = useSharedValue(0);
  const progress = useSharedValue(0);

  const secretStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: secretScale.value },
      { rotateZ: `${secretRotate.value}deg` }
    ],
  }));

  const onSecretTap = (navCallback?: () => void, isAdminBadge = false) => {
    adminTapCount.current += 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (adminTapTimer.current) clearTimeout(adminTapTimer.current);
    
    if (adminTapCount.current >= 10) {
      adminTapCount.current = 0;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      secretScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      secretRotate.value = withSpring(0);
      setShowPong(true);
    } else {
      if (isAdminBadge) {
        secretScale.value = withSpring(1 + adminTapCount.current * 0.08, { damping: 8, stiffness: 300 });
        const shakeAmount = adminTapCount.current * 2;
        secretRotate.value = withSequence(
          withSpring(-shakeAmount, { damping: 5, stiffness: 400 }),
          withSpring(shakeAmount, { damping: 5, stiffness: 400 }),
          withSpring(0, { damping: 10, stiffness: 300 })
        );
      }
      
      adminTapTimer.current = setTimeout(() => { 
        if (adminTapCount.current === 1 && navCallback) {
          navCallback();
        }
        adminTapCount.current = 0;
        secretScale.value = withSpring(1);
        secretRotate.value = withSpring(0);
      }, 250);
    }
  };

  const [publicProfile, setPublicProfile] = useState<{
    username: string;
    avatarUrl?: string;
    city: string;
    country: string;
    flag: string;
    streakDays: number;
    isPro: boolean;
    isAdmin: boolean;
    joinedAt: string;
    packs: number;
    countries: number;
    countryList: { flag: string; name: string }[];
    packedWith: { flag: string; name: string }[];
    invitedBy: string | null;
    vibeProfile?: Record<string, number>;
    hasPongBadge?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [vibeExpanded, setVibeExpanded] = useState(false);

  const [openInvitesCount, setOpenInvitesCount] = useState<number | null>(null);

  const fetchInviteCount = useCallback(async () => {
    if (!isOwnProfile || !token) return;
    try {
      const res = await APIService.getInviteSlots(token);
      const openCount = (res.slots ?? []).filter((s: any) => s.status === 'open').length;
      setOpenInvitesCount(openCount);
    } catch (e) {
      console.warn('failed to load invite slots for profile banner:', e);
      if (me) {
        setOpenInvitesCount(me.inviteSlots);
      }
    }
  }, [isOwnProfile, token, me]);

  useEffect(() => {
    if (isOwnProfile) {
      refreshStreak();
      refreshPacks();
      fetchInviteCount();
    }
  }, [isOwnProfile, fetchInviteCount]);

  useEffect(() => {
    if (!isOwnProfile && targetUsername) {
      setLoading(true);
      APIService.getPublicProfile(targetUsername)
        .then((p) => setPublicProfile(p))
        .catch((e) => {
          console.warn('failed to load public profile:', e);
        })
        .finally(() => setLoading(false));
    }
  }, [isOwnProfile, targetUsername]);

  const onRefresh = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    if (isOwnProfile) {
      await Promise.all([refreshStreak(), refreshPacks(), fetchInviteCount()]);
    } else if (targetUsername) {
      setLoading(true);
      await APIService.getPublicProfile(targetUsername)
        .then((p) => setPublicProfile(p))
        .catch((e) => {
          console.warn('failed to refresh public profile:', e);
        })
        .finally(() => setLoading(false));
    }
    setRefreshing(false);
    triggeredRef.current = false;
    progress.value = 0;
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  }, [isOwnProfile, targetUsername, refreshStreak, refreshPacks, fetchInviteCount]);

  const displayUser = isOwnProfile ? me : publicProfile;
  const isPro = displayUser?.isPro ?? false;

  // Real counters from backend (own profile only)
  const realPacksCount = isOwnProfile ? packs.length : (publicProfile?.packs ?? 0);
  const realCountriesCount = useMemo(() => {
    if (!isOwnProfile) return publicProfile?.countries ?? 0;
    const set = new Set<string>();
    for (const p of packs) {
      for (const m of p.members) if (m.country) set.add(m.country);
    }
    return set.size;
  }, [packs, isOwnProfile, publicProfile]);
  const realPackedWith = useMemo(() => {
    if (!isOwnProfile) return publicProfile?.packedWith ?? [];
    const map = new Map<string, { flag: string; name: string }>();
    for (const p of packs) {
      for (const m of p.members) {
        if (m.country && m.country !== me?.country && !map.has(m.country)) {
          map.set(m.country, { flag: m.flag, name: m.country });
        }
      }
    }
    return Array.from(map.values());
  }, [packs, me, isOwnProfile, publicProfile]);

  const countryList = useMemo(() => {
    if (!isOwnProfile) return (publicProfile?.countryList ?? []).map((c: any) => ({ ...c, count: c.count ?? 1 }));
    const map = new Map<string, { flag: string; name: string; members: Set<string> }>();
    for (const p of packs) {
      for (const m of p.members) {
        if (!m.country) continue;
        if (!map.has(m.country)) {
          map.set(m.country, { flag: m.flag, name: m.country, members: new Set() });
        }
        map.get(m.country)!.members.add(m.userId);
      }
    }
    return Array.from(map.values()).map((c) => ({ flag: c.flag, name: c.name, count: c.members.size }));
  }, [packs, isOwnProfile, publicProfile]);

  // Members with city data for the map
  const mapMembers = useMemo(() => {
    if (!isOwnProfile) {
      // For another user's profile we only have aggregated country data — synthesise
      // one "member" per country using their flag so the map shows country markers.
      return (publicProfile?.countryList ?? []).map((c: { flag: string; name: string }, i: number) => ({
        userId: `country-${i}`,
        city: c.name,
        country: c.name,
        flag: c.flag,
      }));
    }
    const seen = new Set<string>();
    const result: { userId: string; city: string; country: string; flag: string; lat?: number; lng?: number }[] = [];
    for (const p of packs) {
      for (const m of p.members) {
        if (!m.country || !m.city || seen.has(m.userId)) continue;
        seen.add(m.userId);
        result.push({
          userId: m.userId,
          city: m.city,
          country: m.country,
          flag: m.flag,
          lat: m.lat,
          lng: m.lng,
        });
      }
    }
    return result;
  }, [packs, isOwnProfile, publicProfile]);

  // Compute vibemeter from streak.history (own) or public profile (other)
  const vibe = useMemo(() => {
    if (!isOwnProfile && publicProfile?.vibeProfile) {
      return ALL_FILTERS.reduce((acc, f) => ({
        ...acc,
        [f]: publicProfile.vibeProfile![f] ?? 0,
      }), {} as Record<VibeFilter, number>);
    }
    const counts = ALL_FILTERS.reduce((acc, f) => ({ ...acc, [f]: 0 }), {} as Record<VibeFilter, number>);
    const history = streak?.history ?? [];
    for (const h of history) {
      const f = normalizeFilter(h.filter);
      counts[f] += 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) return me?.vibeProfile.filterUsage ?? counts;
    return ALL_FILTERS.reduce((acc, f) => ({ ...acc, [f]: counts[f] / total }), {} as Record<VibeFilter, number>);
  }, [streak, me, isOwnProfile, publicProfile]);

  const onPickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionNeeded'), t('allowPhotoAccess'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        const dir = FileSystem.documentDirectory ?? '';
        const dest = `${dir}avatar-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
        updateAvatar(dest);
      } catch (err) {
        console.error('Error copying avatar image:', err);
        updateAvatar(result.assets[0].uri);
      }
    }
  };

  useEffect(() => {
    setAvatarLoadError(false);
  }, [displayUser?.avatarUrl]);

  const onAvatarPress = () => {
    Haptics.selectionAsync?.();
    if (isOwnProfile) {
      Alert.alert(t('profilePhoto'), undefined, [
        { text: displayUser?.avatarUrl ? t('changePhoto') : t('addPhoto'), onPress: () => void onPickPhoto() },
        ...(displayUser?.avatarUrl ? [{ text: t('viewPhoto'), onPress: () => setAvatarViewer(true) }] : []),
        { text: t('cancel'), style: 'cancel' }
      ] as any);
    } else if (displayUser?.avatarUrl && !avatarLoadError) {
      setAvatarViewer(true);
    }
  };

  if (!me) return <View style={styles.wrap} />;
  if (!isOwnProfile && loading) {
    return (
      <View style={[styles.wrap, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.yellow} />
      </View>
    );
  }
  if (!isOwnProfile && !publicProfile) {
    return (
      <View style={[styles.wrap, { alignItems: 'center', justifyContent: 'center' }]}>
        <ScaledText style={{ color: colors.textDim }}>{t('userNotFound')}</ScaledText>
      </View>
    );
  }

  const historyCount = streak?.history?.length ?? 0;
  const initials = (displayUser?.username ?? '').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <ScrollView
        ref={scrollRef}
        style={styles.wrap}
        contentContainerStyle={{ paddingBottom: 40 }}
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
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(6, insets.top) }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!isOwnProfile && (
            <Pressable onPress={() => nav.goBack()} style={{ marginRight: 4 }}>
              <Ionicons name="chevron-back" size={22} color={colors.white} />
            </Pressable>
          )}
          <ScaledText style={[styles.username, ...(largerText ? [{ fontSize: 20 } as any] : [])]}>@{displayUser?.username}</ScaledText>
          {isPro && (
            <View style={styles.proPill}>
              <Ionicons name="flash" size={9} color="#000" />
              <ScaledText style={styles.proPillText}>{t('pro')}</ScaledText>
            </View>
          )}
        </View>
        {isOwnProfile ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {me.isAdmin && (
              <Pressable onPress={() => nav.navigate('Admin')} style={styles.iconBtn}>
                <Ionicons name="shield-checkmark" size={18} color={colors.yellow} />
              </Pressable>
            )}
            <Pressable onPress={() => nav.navigate('Pro')} style={[styles.iconBtn, me.isPro && { backgroundColor: 'rgba(255,214,10,0.15)' }]}>
              <Ionicons name={me.isPro ? 'flash' : 'flash-outline'} size={18} color={colors.yellow} />
            </Pressable>
            <Pressable onPress={() => nav.navigate('Invite')} style={styles.iconBtn}>
              <Ionicons name="mail-outline" size={18} color={colors.white} />
            </Pressable>
            <Pressable onPress={() => nav.navigate('Settings')} style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={18} color={colors.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => {
              Alert.alert(
                t('reportUser', { username: displayUser?.username }),
                t('reportReasonQuestion'),
                [
                  { text: t('cancel'), style: 'cancel' },
                  ...[
                    { key: 'inappropriate content', label: t('reportReasonInappropriate') },
                    { key: 'harassment', label: t('reportReasonHarassment') },
                    { key: 'spam', label: t('reportReasonSpam') },
                    { key: 'other', label: t('reportReasonOther') }
                  ].map(({ key, label }) => ({
                    text: label,
                    onPress: async () => {
                      if (!token || !displayUser) return;
                      try {
                        const target = publicProfile;
                        if (!target) return;
                        await APIService.reportUser(token, target.username, key);
                        Alert.alert(t('reportedSuccess'), t('reportedThankYou'));
                      } catch {
                        Alert.alert(t('reportedError'), t('reportedErrorSubtitle'));
                      }
                    },
                  })),
                ],
              );
            }}
            style={styles.iconBtn}
          >
            <Ionicons name="flag-outline" size={18} color={colors.red} />
          </Pressable>
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <Pressable onPress={onAvatarPress} style={[styles.avatar, isPro && styles.avatarPro]}>
          {displayUser?.avatarUrl && !avatarLoadError ? (
            <Image
              source={{ uri: displayUser.avatarUrl }}
              style={styles.avatarImg}
              onLoad={() => console.log('avatar loaded:', displayUser.avatarUrl)}
              onError={(e) => {
                console.error('avatar load error:', e.error, displayUser.avatarUrl);
                setAvatarLoadError(true);
              }}
            />
          ) : (
            <ScaledText style={styles.avatarInitials}>{initials}</ScaledText>
          )}
          {isOwnProfile && (
            <View style={styles.avatarEdit}>
              <Ionicons name="camera" size={11} color="#000" />
            </View>
          )}
          <StreakBadge
            days={displayUser?.streakDays ?? 0}
            onPress={isOwnProfile ? () => nav.navigate('Streak') : undefined}
          />
        </Pressable>
        <ScaledText style={styles.location}>{displayUser?.city}, {displayUser?.country}</ScaledText>
        <View style={styles.statsRow}>
          <Stat n={realPacksCount} l={t('packs')} onPress={isOwnProfile ? () => nav.navigate('PackCalendar') : undefined} />
          <Stat n={realCountriesCount} l={t('countries')} onPress={isOwnProfile ? () => nav.navigate('Countries') : undefined} />
          <Stat n={displayUser?.streakDays ?? 0} l={t('streak')} onPress={isOwnProfile ? () => nav.navigate('Streak') : undefined} />
        </View>
        <View style={{ alignItems: 'center' }}>
          {isOwnProfile && me.isAdmin ? (
            <Animated.View style={secretStyle}>
              <Pressable onPress={() => onSecretTap(undefined, true)} hitSlop={10} style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={11} color={colors.yellow} />
                <ScaledText style={styles.adminBadgeText}>{t('admin')}</ScaledText>
              </Pressable>
            </Animated.View>
          ) : isOwnProfile && me.invitedBy ? (
            <Pressable
              onPress={() => onSecretTap(() => nav.push('PublicProfile', { username: me.invitedBy! }))}
              style={styles.invitedBy}
            >
              <ScaledText style={styles.invitedByText}>
                {t('invitedBy')} <ScaledText style={styles.invitedByAt}>@{me.invitedBy}</ScaledText>
              </ScaledText>
              <Ionicons name="chevron-forward" size={12} color={colors.textFade} />
            </Pressable>
          ) : null}
          {!isOwnProfile && publicProfile?.isAdmin ? (
            <Animated.View style={secretStyle}>
              <Pressable onPress={() => onSecretTap(undefined, true)} style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={11} color={colors.yellow} />
                <ScaledText style={styles.adminBadgeText}>{t('admin')}</ScaledText>
              </Pressable>
            </Animated.View>
          ) : !isOwnProfile && publicProfile?.invitedBy ? (
            <Pressable
              onPress={() => onSecretTap(() => nav.push('PublicProfile', { username: publicProfile.invitedBy! }))}
              style={styles.invitedBy}
            >
              <ScaledText style={styles.invitedByText}>
                {t('invitedBy')} <ScaledText style={styles.invitedByAt}>@{publicProfile.invitedBy}</ScaledText>
              </ScaledText>
              <Ionicons name="chevron-forward" size={12} color={colors.textFade} />
            </Pressable>
          ) : null}
          {displayUser?.hasPongBadge && (
            <Pressable onPress={() => setShowPong(true)} style={styles.pongBadge}>
              <Ionicons name="trophy" size={11} color={colors.yellow} />
              <ScaledText style={styles.pongBadgeText}>{t('pongChampion')}</ScaledText>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* VIBEMETER */}
      <View style={styles.section}>
        <ScaledText style={styles.sectionLabel}>{t('vibemeter')}</ScaledText>
        <View style={styles.card}>
          {(vibeExpanded ? ALL_FILTERS : FREE_FILTERS).map((f) => (
            <VibemeterBar key={f} filter={f} value={vibe[f] ?? 0} />
          ))}
          <Pressable onPress={() => setVibeExpanded((v) => !v)} style={styles.vibeExpand}>
            <Ionicons name={vibeExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textFade} />
            <ScaledText style={styles.vibeExpandText}>{vibeExpanded ? t('showLess') : t('showAllFilters')}</ScaledText>
          </Pressable>
          {isOwnProfile && (
            <ScaledText style={styles.cardFooter}>{t('builtFromFlashes', { count: historyCount })}</ScaledText>
          )}
        </View>
      </View>

      {/* PRO FEATURES — own profile only */}
      {isOwnProfile && (
        <View style={styles.section}>
          <ScaledText style={styles.sectionLabel}>{t('flashPro')}</ScaledText>
          <Pressable onPress={() => nav.navigate('Pro')} style={[styles.proCard, me.isPro && styles.proCardActive]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name="flash" size={14} color={colors.yellow} />
              <ScaledText style={styles.proCardTitle}>{me.isPro ? t('proActive') : t('upgradeToPro')}</ScaledText>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={14} color={colors.textFade} />
            </View>
            <View style={{ gap: 4 }}>
              {[
                t('proBenefit1'),
                t('proBenefit2'),
                t('proBenefit3'),
                t('proBenefit4'),
                t('proBenefit5'),
              ].map((line) => (
                <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={me.isPro ? 'checkmark-circle' : 'lock-closed'}
                    size={11}
                    color={me.isPro ? colors.green : colors.textFade}
                  />
                  <ScaledText style={styles.proCardLine}>{line}</ScaledText>
                </View>
              ))}
            </View>
          </Pressable>
        </View>
      )}

      {/* INVITES — own profile only */}
      {isOwnProfile && openInvitesCount !== null && (
        <View style={styles.section}>
          <ScaledText style={styles.sectionLabel}>{t('invites')}</ScaledText>
          {openInvitesCount > 0 ? (
            <Pressable
              onPress={() => nav.navigate('Invite')}
              style={styles.inviteBannerCard}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.inviteIconCircle}>
                  <Ionicons name="people" size={16} color={colors.yellow} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ScaledText style={styles.inviteBannerTitle}>
                    {t('moreInvites', { count: openInvitesCount })}
                  </ScaledText>
                  <ScaledText style={styles.inviteBannerSubtitle}>
                    {t('inviteFriendsSubtitle')}
                  </ScaledText>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textFade} />
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => (!me?.isPro ? nav.navigate('Pro') : nav.navigate('Invite'))}
              style={styles.inviteBannerCard}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.inviteIconCircle, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                  <Ionicons name="lock-closed" size={14} color={colors.textFade} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <ScaledText style={styles.inviteBannerTitle}>{t('noInvitesLeft')}</ScaledText>
                  <ScaledText style={styles.inviteBannerSubtitle}>
                    {!me?.isPro ? t('upgradeForMoreInvites') : t('allInviteSlotsUsed')}
                  </ScaledText>
                </View>
                {!me?.isPro && <Ionicons name="chevron-forward" size={14} color={colors.textFade} />}
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* COUNTRIES */}
      {countryList.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ScaledText style={styles.sectionLabel}>{t('countries')}</ScaledText>
            <Pressable onPress={() => setShowMap(true)} style={styles.mapBtn}>
              <Ionicons name="map-outline" size={12} color={colors.yellow} />
              <ScaledText style={styles.mapBtnText}>{t('viewMap')}</ScaledText>
            </Pressable>
          </View>
          <View style={styles.chipWrap}>
            {countryList.slice(0, 6).map((c) => (
              <CountryChip
                key={c.name}
                flag={c.flag}
                name={c.name}
                onPress={() => Alert.alert(`${c.flag} ${c.name}`)}
              />
            ))}
            {countryList.length > 6 && (
              <View style={styles.moreChip}>
                <ScaledText style={styles.moreChipText}>{t('moreCountries', { count: countryList.length - 6 })}</ScaledText>
              </View>
            )}
          </View>
        </View>
      )}

      {/* PACKED WITH */}
      {realPackedWith.length > 0 && (
        <View style={styles.section}>
          <ScaledText style={styles.sectionLabel}>{t('packedWith')}</ScaledText>
          <View style={styles.chipWrap}>
            {realPackedWith.slice(0, 4).map((c) => (
              <CountryChip
                key={c.name}
                flag={c.flag}
                name={c.name}
                onPress={() => Alert.alert(`${c.flag} ${c.name}`)}
              />
            ))}
            {realPackedWith.length > 4 && (
              <View style={styles.moreChip}>
                <ScaledText style={styles.moreChipText}>{t('moreCountries', { count: realPackedWith.length - 4 })}</ScaledText>
              </View>
            )}
          </View>
        </View>
      )}



      {/* Fullscreen avatar viewer */}
      <Modal visible={avatarViewer} transparent animationType="fade" onRequestClose={() => setAvatarViewer(false)}>
        <Pressable style={styles.viewerWrap} onPress={() => setAvatarViewer(false)}>
          <Pressable
            onPress={() => setAvatarViewer(false)}
            style={[styles.viewerClose, { top: Math.max(16, insets.top) }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </Pressable>
          {displayUser?.avatarUrl ? (
            <Image source={{ uri: displayUser.avatarUrl }} style={styles.viewerImg} contentFit="contain" />
          ) : null}
        </Pressable>
      </Modal>

      <PongGame visible={showPong} onClose={() => setShowPong(false)} />

      <CountryMapModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        members={mapMembers}
      />
      </ScrollView>

      {!isOwnProfile && (
        <View style={[styles.bottomNav, { paddingBottom: Math.max(12, insets.bottom) }]}>
          <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Feed' })} style={styles.navItem}>
            <Ionicons name="grid-outline" size={22} color="rgba(255,255,255,0.35)" />         
          </Pressable>
          <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Camera' })} style={styles.navItem}>
            <Ionicons name="camera-outline" size={22} color="rgba(255,255,255,0.35)" />
          </Pressable>
          <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Profile' })} style={styles.navItem}>
            <Ionicons name="person" size={22} color={colors.yellow} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const Stat = ({ n, l, onPress }: { n: number; l: string; onPress?: () => void }) => {
  const statStyles = useThemedStyles(makeStatStyles);
  return (
    <Pressable onPress={onPress} style={statStyles.wrap} disabled={!onPress}>
      <ScaledText style={statStyles.n}>{n}</ScaledText>
      <ScaledText style={statStyles.l}>{l}</ScaledText>
    </Pressable>
  );
};

const makeStatStyles = (colors: Palette) => StyleSheet.create({
  wrap: { alignItems: 'center', minWidth: 70 },
  n: { color: colors.white, fontSize: 18, fontWeight: '700' },
  l: { color: colors.textDim, fontSize: 10, marginTop: 2 },
});

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  username: { color: colors.white, fontSize: 16, fontWeight: '600' },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: { alignItems: 'center', paddingVertical: 14, gap: 6 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPro: {
    borderColor: colors.yellow,
    borderWidth: 2.5,
    shadowColor: colors.yellow,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.yellow,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
  },
  proPillText: { color: '#000', fontSize: 9, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,214,10,0.10)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.25)',
  },
  verifiedText: { color: colors.yellow, fontSize: 9, fontWeight: '700' },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.20)',
  },
  adminBadgeText: { color: colors.yellow, fontSize: 11, fontWeight: '700' },
  pongBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.20)',
  },
  pongBadgeText: { color: colors.yellow, fontSize: 11, fontWeight: '700' },
  vibeExpand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    marginTop: 4,
  },
  vibeExpandText: { color: colors.textFade, fontSize: 10, fontWeight: '600' },
  proCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  proCardActive: {
    borderColor: 'rgba(255,214,10,0.4)',
    backgroundColor: 'rgba(255,214,10,0.04)',
  },
  proCardTitle: { color: colors.white, fontSize: 13, fontWeight: '700' },
  proCardLine: { color: colors.textSecondary, fontSize: 11 },
  avatarImg: { width: 76, height: 76, borderRadius: 38 },
  avatarInitials: { color: colors.white, fontSize: 24, fontWeight: '800' },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.black,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  sheetRowText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  sheetCancel: {
    justifyContent: 'center',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  viewerWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: { position: 'absolute', right: 16, zIndex: 2, padding: 4 },
  viewerImg: { width: '92%', height: '70%' },
  streak: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: colors.black,
  },
  streakText: { color: '#000', fontWeight: '700', fontSize: 10 },
  location: { color: colors.textDim, fontSize: 11 },
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  invitedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  invitedByText: { color: colors.textDim, fontSize: 11 },
  invitedByAt: { color: colors.yellow, fontWeight: '600' },
  inviteBannerCard: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  inviteIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 214, 10, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBannerTitle: { color: colors.white, fontSize: 13, fontWeight: '700' },
  inviteBannerSubtitle: { color: colors.textSecondary, fontSize: 11 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#1e1e1e', marginHorizontal: 12, marginVertical: 6 },
  section: { paddingHorizontal: 12, paddingTop: 10, gap: 6 },
  sectionLabel: { color: colors.textDim, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  cardFooter: {
    color: colors.textHint,
    fontSize: 9,
    textAlign: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  moreChipText: { color: colors.textDim, fontSize: 11 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,214,10,0.10)',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.20)',
  },
  mapBtnText: { color: colors.yellow, fontSize: 10, fontWeight: '700' },
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
});
