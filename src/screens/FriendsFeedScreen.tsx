import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LeftMenu from '../ui/LeftMenu';
import FlashLogo from '../components/FlashLogo';
import PackCard from '../components/PackCard';
import type { FriendsPackInvite } from '../types/models';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { APIService } from '../services/api';
import { posthog } from '../config/posthog';

export default function FriendsFeedScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const {
    packs,
    reactions,
    token,
    user,
    unreadCount,
    refreshPacks,
    refreshNotifications,
  } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [invites, setInvites] = useState<FriendsPackInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const friendsPacks = useMemo(
    () => packs.filter(
      (pack) =>
        pack.packType === 'friends'
        && pack.status !== 'expired'
        && new Date(pack.expiresAt).getTime() > Date.now(),
    ),
    [packs],
  );

  const load = useCallback(async (showRefresh = false) => {
    if (!token) return;
    if (showRefresh) setRefreshing(true);
    try {
      const [, pending] = await Promise.all([
        refreshPacks(),
        APIService.getFriendsPackInvites(token),
        refreshNotifications(),
      ]);
      setInvites(pending);
    } catch (error) {
      console.warn('failed to load friends packs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshNotifications, refreshPacks, token]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  useEffect(() => {
    const interval = setInterval(() => load(), 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const respond = async (invite: FriendsPackInvite, accept: boolean) => {
    if (!token || respondingId) return;
    setRespondingId(invite.id);
    try {
      await APIService.respondToFriendsPackInvite(token, invite.id, accept);
      posthog.capture('friends_pack_invite_responded', { accepted: accept, pack_id: invite.packId });
      await load();
    } catch (error) {
      console.warn('failed to respond to friends pack invite:', error);
      Alert.alert('invite not updated', 'please try again.');
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <LeftMenu
      isOpen={menuOpen}
      onOpenChange={setMenuOpen}
      onForYouPress={() => nav.navigate('Tabs', { screen: 'Feed' })}
      onDuetPress={() => nav.navigate('DuetFeed')}
      onFriendsPress={() => nav.navigate('FriendsFeed')}
      onProfilePress={() => nav.navigate('Tabs', { screen: 'Profile' })}
      onSettingsPress={() => nav.navigate('Settings')}
      onCameraPress={() => nav.navigate('Tabs', { screen: 'Camera' })}
      onInvitePress={() => nav.navigate('Invite')}
      onNotificationsPress={() => nav.navigate('Notifications')}
      unreadCount={unreadCount}
    >
      <View style={styles.wrap}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
          <Pressable onPress={() => setMenuOpen(true)} style={styles.iconButton}>
            <Ionicons name="menu-outline" size={28} color={colors.textSecondary} />
          </Pressable>
          <FlashLogo size={22} />
          <Pressable onPress={() => nav.navigate('CreateFriendsPack')} style={styles.newButton}>
            <Ionicons name="add" size={17} color="#000" />
            <Text style={styles.newButtonText}>new</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.yellow}
            />
          }
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="lock-closed" size={17} color="#000" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>friends<Text style={{ color: colors.yellow }}>.</Text>flash</Text>
              <Text style={styles.heroSub}>only your chosen people can see these packs</Text>
            </View>
          </View>

          {invites.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>waiting for your answer</Text>
              {invites.map((invite) => (
                <View key={invite.id} style={styles.inviteCard}>
                  {invite.inviterAvatarUrl ? (
                    <Image source={{ uri: invite.inviterAvatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarText}>{invite.inviterUsername.slice(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.inviteCopy}>
                    <Text style={styles.inviteTitle}>@{invite.inviterUsername}</Text>
                    <Text style={styles.inviteSub}>
                      invited you to a private {invite.targetMemberCount}-person pack
                    </Text>
                  </View>
                  {respondingId === invite.id ? (
                    <ActivityIndicator color={colors.yellow} />
                  ) : (
                    <View style={styles.inviteActions}>
                      <Pressable onPress={() => respond(invite, false)} style={styles.declineButton}>
                        <Ionicons name="close" size={17} color={colors.textSecondary} />
                      </Pressable>
                      <Pressable onPress={() => respond(invite, true)} style={styles.acceptButton}>
                        <Ionicons name="checkmark" size={17} color="#000" />
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>your private packs</Text>
            {loading ? (
              <ActivityIndicator color={colors.yellow} style={styles.loader} />
            ) : friendsPacks.length ? (
              friendsPacks.map((pack) => {
                const target = pack.targetMemberCount ?? 4;
                const rosterReady = pack.members.length >= target;
                const me = pack.members.find((member) => member.userId === user?.id);
                return (
                  <View key={pack.id} style={styles.packWrap}>
                    {!rosterReady ? (
                      <View style={styles.waitingBanner}>
                        <Ionicons name="flash" size={16} color={colors.yellow} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.waitingTitle}>waiting for friends to join</Text>
                          <Text style={styles.waitingSub}>{pack.members.length}/{target} lights are in</Text>
                        </View>
                      </View>
                    ) : !me?.hasPosted ? (
                      <Pressable
                        onPress={() => nav.navigate('FriendsCamera', { friendsPackId: pack.id })}
                        style={styles.flashButton}
                      >
                        <Ionicons name="camera" size={16} color="#000" />
                        <Text style={styles.flashButtonText}>flash into this private pack</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.waitingBanner}>
                        <Ionicons name="time-outline" size={16} color={colors.yellow} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.waitingTitle}>your flash is in</Text>
                          <Text style={styles.waitingSub}>
                            {pack.members.filter((member) => member.hasPosted).length}/{target} friends have posted
                          </Text>
                        </View>
                      </View>
                    )}
                    <PackCard
                      pack={pack}
                      reactions={reactions[pack.id] ?? []}
                      onPress={() => nav.navigate('PackReveal', { packId: pack.id })}
                    />
                  </View>
                );
              })
            ) : (
              <View style={styles.empty}>
                <Ionicons name="people-circle-outline" size={48} color={colors.textHint} />
                <Text style={styles.emptyTitle}>make a moment with your people</Text>
                <Text style={styles.emptySub}>choose 2 or 4 people. nobody else can discover it.</Text>
                <Pressable onPress={() => nav.navigate('CreateFriendsPack')} style={styles.createButton}>
                  <Ionicons name="add" size={17} color="#000" />
                  <Text style={styles.createButtonText}>new private pack</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </LeftMenu>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  topBar: {
    minHeight: 58, paddingHorizontal: 14, paddingBottom: 8, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  newButton: {
    height: 32, paddingHorizontal: 11, borderRadius: 10, backgroundColor: colors.yellow,
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  newButtonText: { color: '#000', fontSize: 11, fontWeight: '800' },
  content: { padding: 12, paddingBottom: 40 },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,214,10,0.08)', borderWidth: 1, borderColor: 'rgba(255,214,10,0.24)',
  },
  heroIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.yellow,
    alignItems: 'center', justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  heroTitle: { color: colors.white, fontSize: 18, fontWeight: '900' },
  heroSub: { color: colors.textDim, fontSize: 10, marginTop: 3 },
  section: { marginTop: 20 },
  sectionTitle: {
    color: colors.textDim, fontSize: 11, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 9,
  },
  inviteCard: {
    minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11,
    borderRadius: 14, backgroundColor: colors.surfaceSofter, borderWidth: 1,
    borderColor: colors.border, marginBottom: 8,
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#000', fontWeight: '800', fontSize: 11 },
  inviteCopy: { flex: 1 },
  inviteTitle: { color: colors.white, fontSize: 13, fontWeight: '800' },
  inviteSub: { color: colors.textDim, fontSize: 10, lineHeight: 14, marginTop: 3 },
  inviteActions: { flexDirection: 'row', gap: 6 },
  declineButton: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  acceptButton: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center',
    justifyContent: 'center', backgroundColor: colors.yellow,
  },
  loader: { marginVertical: 30 },
  packWrap: { marginBottom: 14 },
  waitingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11,
    backgroundColor: 'rgba(255,214,10,0.08)', borderWidth: 1, borderColor: 'rgba(255,214,10,0.18)',
  },
  waitingTitle: { color: colors.white, fontSize: 11, fontWeight: '700' },
  waitingSub: { color: colors.textDim, fontSize: 9, marginTop: 2 },
  flashButton: {
    height: 42, marginBottom: 7, borderRadius: 11, backgroundColor: colors.yellow,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  flashButtonText: { color: '#000', fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 54 },
  emptyTitle: { color: colors.white, fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptySub: { color: colors.textDim, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 6 },
  createButton: {
    marginTop: 18, height: 44, paddingHorizontal: 17, borderRadius: 11,
    backgroundColor: colors.yellow, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  createButtonText: { color: '#000', fontSize: 12, fontWeight: '800' },
});
