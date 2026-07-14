import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import LoadErrorBanner from '../components/LoadErrorBanner';
import { APIService, NotificationItem } from '../services/api';
import { t } from '../services/i18n';

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  pack: 'cube-outline',
  comment: 'chatbubble-outline',
  reaction: 'happy-outline',
  streak: 'flame-outline',
  system: 'megaphone-outline',
  invite: 'person-add-outline',
  screenshot: 'warning-outline',
};

const makeTypeColor = (colors: Palette): Record<string, string> => ({
  pack: colors.green,
  comment: colors.yellow,
  reaction: colors.yellow,
  streak: colors.red,
  system: colors.yellow,
  invite: colors.yellow,
  screenshot: colors.red,
});

export default function NotificationsScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const typeColor = makeTypeColor(colors);
  const nav = useNavigation<any>();
  const { markAllRead, markOneRead, token } = useAppState();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await APIService.getNotifications(token);
      setItems(res);
      setError(false);
    } catch (e) {
      console.warn('failed to load notifications:', e);
      setError(true);
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onMarkRead = async () => {
    if (!token) return;
    try {
      await APIService.markNotificationsRead(token);
      markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch (e) {
      console.warn('failed to mark notifications read:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onTap = (n: NotificationItem) => {
    if (!n.readAt) {
      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item)));
      markOneRead();
      if (token) APIService.markNotificationRead(token, n.id).catch((e) => {
        console.warn('failed to mark notification read:', e);
      });
    }
    if (n.packId) nav.navigate('PackReveal', { packId: n.packId });
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>{t('notifications')}</Text>
        <Pressable onPress={onMarkRead} style={styles.clearBtn}>
          <Text style={styles.clearText}>{t('markRead')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.yellow} />}
      >
        {loading && <ActivityIndicator color={colors.yellow} style={{ marginVertical: 30 }} />}
        <LoadErrorBanner
          visible={error && !loading}
          onRetry={onRefresh}
          message={t('couldntLoadNotifications')}
        />
        {!loading && !error && items.length === 0 && (
          <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: 40, fontSize: 12 }}>
            {t('noNotificationsYet')}
          </Text>
        )}
        {items.map((n) => {
          const unread = !n.readAt;
          const icon = typeIcon[n.type] ?? 'notifications-outline';
          const color = typeColor[n.type] ?? colors.yellow;
          return (
            <Pressable key={n.id} onPress={() => onTap(n)} style={[styles.row, unread && styles.rowUnread]}>
              <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={14} color={color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                {n.body ? <Text style={styles.rowBody}>{n.body}</Text> : null}
                <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
              </View>
              {unread && <View style={styles.unreadDot} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 16, fontWeight: '700' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  clearText: { color: colors.yellow, fontSize: 11, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  rowUnread: {
    borderColor: 'rgba(255,214,10,0.2)',
    backgroundColor: 'rgba(255,214,10,0.03)',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowTitle: { color: colors.white, fontSize: 12, fontWeight: '600' },
  rowBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 16 },
  rowTime: { color: colors.textFade, fontSize: 10 },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.yellow,
    marginTop: 6,
  },
});
