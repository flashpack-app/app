import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import FlashLogo from '../components/FlashLogo';
import PackCard from '../components/PackCard';
import LiquidRefresh from '../components/LiquidRefresh';
import StreakWarningBanner from '../components/StreakWarningBanner';
import LeftMenu from '../ui/LeftMenu';
import LoadErrorBanner from '../components/LoadErrorBanner';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { APIService } from '../services/api';
import { InviteSlot } from '../types/models';
import ScaledText from '../components/ScaledText';
import { t } from '../services/i18n';

function useCountdown(target: Date | null): { text: string; hours: number } {
  const [result, setResult] = useState({ text: '', hours: 0 });
  useEffect(() => {
    if (!target) { setResult({ text: '', hours: 0 }); return; }
    const tick = () => {
      const ms = target.getTime() - Date.now();
      if (ms <= 0) { setResult({ text: '', hours: 0 }); return; }
      const m = Math.floor(ms / 60_000);
      const h = Math.floor(m / 60);
      if (h >= 1) {
        setResult({ text: t('time_hm', { h, m: m % 60 }), hours: h });
      } else {
        setResult({ text: t('time_m_only', { m }), hours: 0 });
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [target]);
  return result;
}

export default function DuetFeedScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { packs, discoverPacks, unreadCount, hasPostedFirstPack, reactions, refreshPacks, refreshDiscover, refreshNotifications, lastPostAt, loadErrors, user, token } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [isForming, setIsForming] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [inviteSlotsRemaining, setInviteSlotsRemaining] = useState<number | undefined>(undefined);
  const [inviteSlotsTotal, setInviteSlotsTotal] = useState<number>(3);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const triggeredRef = useRef(false);
  const isFocused = useIsFocused();
  const scrollRef = useRef<FlatList<any>>(null);

  // Filter for duet packs only
  const activeDuetPacks = packs.filter(
    (p) => p.status !== 'expired' && new Date(p.expiresAt).getTime() > Date.now() && p.packType === 'duet',
  );

  const discoverDuetPacks = discoverPacks.filter((p) => p.packType === 'duet');

  // Show forming animation for 2h after posting while waiting for pack
  useEffect(() => {
    if (hasPostedFirstPack && activeDuetPacks.length === 0 && lastPostAt) {
      const posted = new Date(lastPostAt).getTime();
      if (Date.now() - posted < 2 * 3600 * 1000) {
        setIsForming(true);
        const t = setTimeout(() => setIsForming(false), 2 * 3600 * 1000 - (Date.now() - posted));
        return () => clearTimeout(t);
      }
    }
    setIsForming(false);
  }, [hasPostedFirstPack, activeDuetPacks.length, lastPostAt]);

  // Load real packs on mount
  useEffect(() => {
    refreshPacks();
    refreshDiscover();
    refreshNotifications();
    const id = setInterval(() => { refreshNotifications(); }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Load invite slots to calculate remaining
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await APIService.getInviteSlots(token);
        const remaining = res.slots.filter((s: InviteSlot) => s.status === 'open').length;
        const total = res.slots.length;
        setInviteSlotsRemaining(remaining);
        setInviteSlotsTotal(total);
      } catch (e) {
        // Fallback to user's inviteSlots if API fails
        setInviteSlotsRemaining(user?.inviteSlots);
        setInviteSlotsTotal(user?.inviteSlots ?? 3);
      }
    })();
  }, [token]);

  const onRefresh = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await Promise.all([refreshPacks(), refreshDiscover(), refreshNotifications()]);
    setRefreshing(false);
    triggeredRef.current = false;
    progress.value = 0;
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [refreshPacks, refreshDiscover, refreshNotifications]);

  const longPress = (packId: string) => {
    Alert.alert(t('packActionsTitle'), undefined, [
      { text: t('reportLabel'), style: 'destructive', onPress: () => nav.navigate('Report', { packId }) },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const formingTarget = lastPostAt ? new Date(new Date(lastPostAt).getTime() + 2 * 3600 * 1000) : null;
  const formingCountdown = useCountdown(formingTarget);
  const expiresTarget = activeDuetPacks[0]?.expiresAt ? new Date(activeDuetPacks[0].expiresAt) : null;
  const expiresCountdown = useCountdown(expiresTarget);

  return (
    <LeftMenu
      isOpen={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      onForYouPress={() => nav.navigate('Tabs', { screen: 'Feed' })}
      onDuetPress={() => nav.navigate('DuetFeed')}
      onProfilePress={() => nav.navigate('Tabs', { screen: 'Profile' })}
      onSettingsPress={() => nav.navigate('Settings')}
      onCameraPress={() => nav.navigate('Tabs', { screen: 'Camera' })}
      onInvitePress={() => nav.navigate('Invite')}
      onNotificationsPress={() => nav.navigate('Notifications')}
      expiryCountdown={expiresCountdown.text}
      expiryHours={expiresCountdown.hours}
      onExpiryPress={() => nav.navigate('PackLifecycle', { packId: activeDuetPacks[0]?.id })}
      inviteSlotsRemaining={inviteSlotsRemaining}
      inviteSlotsTotal={inviteSlotsTotal}
      unreadCount={unreadCount}
    >
      <View style={styles.wrap}>
      <View style={[styles.topBar, { paddingTop: Math.max(6, insets.top) }]}>
        <Pressable onPress={() => setIsMenuOpen(true)} hitSlop={12} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.logoCenter}>
          <FlashLogo size={22} />
        </View>
        <View style={styles.topRight}>
          <Pressable onPress={() => nav.navigate('Notifications')} style={styles.bell}>
            <Ionicons name="notifications-outline" size={18} color={colors.white} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <ScaledText style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</ScaledText>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <StreakWarningBanner />

      <LoadErrorBanner
        visible={!!(loadErrors.packs || loadErrors.discover)}
        onRetry={onRefresh}
      />

      {hasPostedFirstPack ? (
        isForming ? (
          <View style={styles.locked}>
            <Ionicons name="flash" size={40} color={colors.yellow} />
            <ScaledText style={styles.lockedTitle}>{t('flashingLightsTitle')}</ScaledText>
            <ScaledText style={styles.lockedSub}>
              {t('flashingLightsSubDuet', { time: formingCountdown || t('flashingLightsSubDefault') })}
            </ScaledText>
          </View>
        ) : activeDuetPacks.length === 0 ? (
          <View style={styles.locked}>
            <Ionicons name="flash" size={40} color={colors.yellow} />
            <ScaledText style={styles.lockedTitle}>{t('noActiveDuet')}</ScaledText>
            <ScaledText style={styles.lockedSub}>
              {t('startADuetSub')}
            </ScaledText>
            <Pressable
              onPress={() => nav.navigate('Tabs', { screen: 'Camera' })}
              style={styles.lockedBtn}
            >
              <Ionicons name="camera" size={16} color="#000" />
              <ScaledText style={styles.lockedBtnText}>{t('startADuetBtn')}</ScaledText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={discoverDuetPacks}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListHeaderComponent={
              <View>
                <LiquidRefresh progress={progress} />
                <ScaledText style={styles.sectionLabel}>{t('yourDuetHeader')}</ScaledText>
                {activeDuetPacks.map((item) => (
                  <View key={item.id} style={{ marginBottom: 8 }}>
                    <PackCard
                      pack={item}
                      reactions={reactions[item.id] ?? []}
                      onPress={() => nav.navigate('PackReveal', { packId: item.id })}
                      onLongPress={() => longPress(item.id)}
                    />
                  </View>
                ))}
                {discoverDuetPacks.length > 0 ? (
                  <View style={styles.discoverHeader}>
                    <Ionicons name="people-outline" size={14} color={colors.textDim} />
                    <ScaledText style={styles.sectionLabel}>{t('duetsAroundWorld')}</ScaledText>
                  </View>
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <PackCard
                pack={item}
                reactions={item.reactions?.map((r) => ({ ...r, sentAt: '' })) ?? []}
                onPress={() => nav.navigate('PackReveal', { packId: item.id })}
              />
            )}
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
          />
        )
      ) : (
        <View style={styles.locked}>
          <Ionicons name="lock-closed" size={40} color={colors.textHint} />
          <ScaledText style={styles.lockedTitle}>{t('duetForming')}</ScaledText>
          <ScaledText style={styles.lockedSub}>
            {t('duetFormingSub')}
          </ScaledText>
          <Pressable
            onPress={() => nav.navigate('Tabs', { screen: 'Camera' })}
            style={styles.lockedBtn}
          >
            <Ionicons name="camera" size={16} color="#000" />
            <ScaledText style={styles.lockedBtnText}>{t('takeYourFirstFlash')}</ScaledText>
          </Pressable>
        </View>
      )}
      </View>
    </LeftMenu>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCenter: {
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  topRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  expiry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderRadius: 12,
  },
  expiryText: { color: colors.red, fontSize: 11, fontWeight: '600' },
  bell: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  list: { padding: 12 },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'lowercase',
    marginBottom: 8,
  },
  discoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  onTheWay: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,214,10,0.2)',
  },
  onTheWayText: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  flashAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.yellow,
    borderRadius: 8,
  },
  flashAgainText: { color: '#000', fontWeight: '700', fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: colors.textDim, fontSize: 12 },
  locked: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 14,
  },
  lockedTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginTop: 8 },
  lockedSub: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  lockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.yellow,
    borderRadius: 10,
  },
  lockedBtnText: { color: '#000', fontWeight: '700', fontSize: 13 },
});
