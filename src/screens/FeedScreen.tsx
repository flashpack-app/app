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
import { colors } from '../theme/colors';
import { useAppState } from '../state/AppState';
import { usePreventCapture } from '../services/screenshot';
import ScaledText from '../components/ScaledText';

function useCountdown(target: Date | null): string {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    if (!target) { setTxt(''); return; }
    const tick = () => {
      const ms = target.getTime() - Date.now();
      if (ms <= 0) { setTxt(''); return; }
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

export default function FeedScreen() {
  const { packs, discoverPacks, unreadCount, hasPostedFirstPack, reactions, refreshPacks, refreshDiscover, refreshNotifications, lastPostAt } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [isForming, setIsForming] = useState(false);
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const triggeredRef = useRef(false);
  const isFocused = useIsFocused();
  usePreventCapture(isFocused);

  // Show every pack that is still alive (not expired). The 18h expiry window
  // naturally hides old packs, so we don't filter by calendar day — otherwise a
  // pack you joined late last night would vanish at midnight while still active.
  const activePacks = packs.filter(
    (p) => p.status !== 'expired' && new Date(p.expiresAt).getTime() > Date.now(),
  );

  // Show forming animation for 2h after posting while waiting for pack
  useEffect(() => {
    if (hasPostedFirstPack && packs.length === 0 && lastPostAt) {
      const posted = new Date(lastPostAt).getTime();
      if (Date.now() - posted < 2 * 3600 * 1000) {
        setIsForming(true);
        const t = setTimeout(() => setIsForming(false), 2 * 3600 * 1000 - (Date.now() - posted));
        return () => clearTimeout(t);
      }
    }
    setIsForming(false);
  }, [hasPostedFirstPack, packs.length, lastPostAt]);

  // Load real packs on mount
  useEffect(() => {
    refreshPacks();
    refreshDiscover();
    refreshNotifications();
    const id = setInterval(() => { refreshNotifications(); }, 60_000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRefreshing(true);
    await Promise.all([refreshPacks(), refreshDiscover(), refreshNotifications()]);
    setRefreshing(false);
    triggeredRef.current = false;
  }, [refreshPacks, refreshDiscover, refreshNotifications]);

  const longPress = (packId: string) => {
    Alert.alert('pack actions', undefined, [
      { text: 'report', style: 'destructive', onPress: () => nav.navigate('Report', { packId }) },
      { text: 'cancel', style: 'cancel' },
    ]);
  };

  const formingTarget = lastPostAt ? new Date(new Date(lastPostAt).getTime() + 2 * 3600 * 1000) : null;
  const formingCountdown = useCountdown(formingTarget);
  const expiresTarget = activePacks[0]?.expiresAt ? new Date(activePacks[0].expiresAt) : null;
  const expiresCountdown = useCountdown(expiresTarget);

  return (
    <View style={styles.wrap}>
      <View style={[styles.topBar, { paddingTop: Math.max(6, insets.top) }]}>
        <FlashLogo size={22} />
        <View style={styles.topRight}>
          {expiresCountdown ? (
            <Pressable
              onPress={() => nav.navigate('PackLifecycle', { packId: activePacks[0]?.id })}
              style={styles.expiry}
            >
              <Ionicons name="time-outline" size={14} color={colors.red} />
              <ScaledText style={styles.expiryText}>{expiresCountdown} left</ScaledText>
            </Pressable>
          ) : null}
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

      {hasPostedFirstPack ? (
        isForming ? (
          <View style={styles.locked}>
            <Ionicons name="flash" size={40} color={colors.yellow} />
            <ScaledText style={styles.lockedTitle}>flashing your lights...</ScaledText>
            <ScaledText style={styles.lockedSub}>
              {'your photo is out there.\nmatching you with your pack.\nforming in ' + (formingCountdown || 'a moment') + '.'}
            </ScaledText>
          </View>
        ) : activePacks.length === 0 ? (
          <View style={styles.locked}>
            <Ionicons name="flash" size={40} color={colors.yellow} />
            <ScaledText style={styles.lockedTitle}>no active pack right now</ScaledText>
            <ScaledText style={styles.lockedSub}>
              flash again to start a new pack.{'\n'}the globe unlocks once you're in a pack.
            </ScaledText>
            <Pressable
              onPress={() => nav.navigate('Tabs', { screen: 'Camera' })}
              style={styles.lockedBtn}
            >
              <Ionicons name="camera" size={16} color="#000" />
              <ScaledText style={styles.lockedBtnText}>take a flash</ScaledText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={discoverPacks}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListHeaderComponent={
              <View>
                <LiquidRefresh progress={progress} />
                <ScaledText style={styles.sectionLabel}>your pack</ScaledText>
                {activePacks.map((item) => (
                  <View key={item.id} style={{ marginBottom: 8 }}>
                    <PackCard
                      pack={item}
                      reactions={reactions[item.id] ?? []}
                      onPress={() => nav.navigate('PackReveal', { packId: item.id })}
                      onLongPress={() => longPress(item.id)}
                    />
                  </View>
                ))}
                {discoverPacks.length > 0 ? (
                  <View style={styles.discoverHeader}>
                    <Ionicons name="earth" size={14} color={colors.textDim} />
                    <ScaledText style={styles.sectionLabel}>around the globe</ScaledText>
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
          <ScaledText style={styles.lockedTitle}>your pack is forming.</ScaledText>
          <ScaledText style={styles.lockedSub}>
            take your first photo to unlock the feed.{'\n'}once you flash, your pack appears.
          </ScaledText>
          <Pressable
            onPress={() => nav.navigate('Tabs', { screen: 'Camera' })}
            style={styles.lockedBtn}
          >
            <Ionicons name="camera" size={16} color="#000" />
            <ScaledText style={styles.lockedBtnText}>take your first flash</ScaledText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
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
