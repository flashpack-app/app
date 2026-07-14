import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pack } from '../types/models';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import Mosaic from './Mosaic';
import ReactionStack from './ReactionStack';
import liveLogo from '../assets/live_logo_white.webp';
import { t } from '../services/i18n';

interface PackReaction {
  userId: string;
  emoji: string;
  sentAt: string;
}

interface Props {
  pack: Pack;
  reactions?: PackReaction[];
  onPress?: () => void;
  onLongPress?: () => void;
}

const matchColor = (s: number, colors: Palette) => (s >= 70 ? colors.green : s >= 50 ? colors.amber : colors.textSecondary);

const timeAgo = (iso: string) => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 60) return t('time_m_ago', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time_hm_ago', { h, m: m % 60 });
  return t('time_d_ago', { d: Math.floor(h / 24) });
};

// How long until the pack expires, e.g. "5h 12m left" or "expired".
const timeLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t('time_expired');
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  return h > 0 ? t('time_hm_left', { h, m: m % 60 }) : t('time_m_left', { m });
};

const PackCard: React.FC<Props> = ({ pack, reactions = [], onPress, onLongPress }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      {/* Top row: avatars + timestamp */}
      <View style={styles.topRow}>
        <View style={styles.avatars}>
          {pack.members.slice(0, 4).map((m, i) => (
            <View
              key={m.id}
              style={[
                styles.avatar,
                { marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i },
                m.isPro && styles.avatarPro,
              ]}
            >
              {m.avatarUrl ? (
                <Image
                  source={{ uri: m.avatarUrl }}
                  style={styles.avatarImg}
                  cachePolicy="memory-disk"
                  recyclingKey={m.avatarUrl}
                  transition={150}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: m.avatarColor }]}>
                  <Text style={styles.avatarText}>{m.initials}</Text>
                </View>
              )}
              {m.isPro && (
                <View style={styles.proDot}>
                  <Ionicons name="flash" size={6} color="#000" />
                </View>
              )}
            </View>
          ))}
        </View>
        <View style={styles.timeWrap}>
          <Text style={styles.timestamp}>{timeAgo(pack.createdAt)}</Text>
          <View style={styles.timeLeftPill}>
            <Ionicons name="time-outline" size={9} color={colors.amber} />
            <Text style={styles.timeLeftText}>{timeLeft(pack.expiresAt)}</Text>
          </View>
        </View>
      </View>

      {/* Mosaic edge-to-edge */}
      <View style={styles.mosaicWrap}>
        <Mosaic pack={pack} height={252} borderRadius={0} cellGap={3} showFlags={false} />
        <Image source={liveLogo} style={styles.liveLogo} />
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <View style={styles.matchWrap}>
          <View style={[styles.dot, { backgroundColor: matchColor(pack.chemistryScore, colors) }]} />
          <Text style={styles.matchText}>{t('match_percent', { score: pack.chemistryScore })}</Text>
        </View>
        <ReactionStack
          reactions={reactions}
          users={pack.members.map((m) => ({
            id: m.id,
            username: m.username,
            avatarUrl: m.avatarUrl,
            avatarColor: m.avatarColor,
          }))}
          maxBubbles={3}
        />
      </View>
    </Pressable>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mosaicWrap: {
    position: 'relative',
  },
  liveLogo: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 12,
    zIndex: 10,
  },
  avatars: { flexDirection: 'row' },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.card,
    overflow: 'visible',
    backgroundColor: '#222',
  },
  avatarPro: { borderColor: colors.yellow, borderWidth: 1.5 },
  avatarImg: { width: 17, height: 17, borderRadius: 9 },
  avatarFallback: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#000', fontSize: 8, fontWeight: '700' },
  proDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.card,
  },
  timeWrap: { alignItems: 'flex-end', gap: 3 },
  timestamp: { color: colors.textFade, fontSize: 10 },
  timeLeftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,179,64,0.12)',
    borderRadius: 8,
  },
  timeLeftText: { color: colors.amber, fontSize: 9, fontWeight: '600' },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  matchWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  matchText: { color: colors.textDim, fontSize: 10 },
});

export default PackCard;
