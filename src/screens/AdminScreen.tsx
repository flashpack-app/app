import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from '../services/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { Palette } from '../theme/colors';
import { useColors } from '../theme/useColors';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAppState } from '../state/AppState';
import { APIService, AdminReport, AdminNotification } from '../services/api';
import { AdminStats, AdminUserRow, GenesisCode } from '../types/models';
import PillButton from '../components/PillButton';

type Tab = 'reports' | 'users' | 'codes' | 'notifications' | 'test';

export default function AdminScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<any>();
  const { token, user } = useAppState();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('reports');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [codes, setCodes] = useState<GenesisCode[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTarget, setComposeTarget] = useState<AdminUserRow | null>(null);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, u, c, r, n] = await Promise.all([
        APIService.adminStats(token),
        APIService.adminUsers(token),
        APIService.adminListGenesis(token),
        APIService.adminListReports(token),
        APIService.adminListNotifications(token),
      ]);
      setStats(s);
      setUsers(u);
      setCodes(c);
      setReports(r);
      setNotifications(n);
    } catch (e: any) {
      Alert.alert('admin load failed', e?.message ?? 'unknown');
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const generateCode = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const created = await APIService.adminCreateGenesis(token, 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await load();
      Alert.alert('code generated', created[0]);
    } catch (e: any) {
      Alert.alert('failed', e?.message ?? 'unknown');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleAdmin = (target: AdminUserRow) => {
    if (!token) return;
    Alert.alert(
      target.isAdmin ? 'remove admin?' : 'make admin?',
      `@${target.username}`,
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'confirm',
          onPress: async () => {
            try {
              await APIService.adminSetAdmin(token, target.id, !target.isAdmin);
              await load();
            } catch (e: any) {
              Alert.alert('failed', e?.message ?? 'unknown');
            }
          },
        },
      ],
    );
  };

  const resolveReport = (id: string, action: 'resolve' | 'dismiss') => {
    if (!token) return;
    (async () => {
      try {
        await APIService.adminResolveReport(token, id, action);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await load();
      } catch (e: any) {
        Alert.alert('failed', e?.message ?? 'unknown');
      }
    })();
  };

  const resetPackTimer = (packId: string) => {
    if (!token) return;
    Alert.alert(
      'reset pack timer?',
      'this gives the pack a fresh 18 hours from now. expired packs become open again.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'reset 18h',
          onPress: async () => {
            try {
              await APIService.adminResetPackTimer(token, packId, 18);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await load();
            } catch (e: any) {
              Alert.alert('failed', e?.message ?? 'unknown');
            }
          },
        },
      ],
    );
  };

  const deletePack = (packId: string) => {
    if (!token) return;
    Alert.alert('delete pack?', 'this removes the pack and all photos in it. permanent.', [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await APIService.adminDeletePack(token, packId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await load();
          } catch (e: any) {
            Alert.alert('failed', e?.message ?? 'unknown');
          }
        },
      },
    ]);
  };

  const togglePro = (target: AdminUserRow) => {
    if (!token) return;
    (async () => {
      try {
        await APIService.adminSetPro(token, target.id, !target.isPro);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await load();
      } catch (e: any) {
        Alert.alert('failed', e?.message ?? 'unknown');
      }
    })();
  };

  const resetStreak = (target: AdminUserRow) => {
    if (!token) return;
    Alert.alert('reset streak?', `@${target.username} will go back to 0 days.`, [
      { text: 'cancel', style: 'cancel' },
      {
        text: 'reset',
        style: 'destructive',
        onPress: async () => {
          try {
            await APIService.adminResetStreak(token, target.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await load();
          } catch (e: any) {
            Alert.alert('failed', e?.message ?? 'unknown');
          }
        },
      },
    ]);
  };

  const openCompose = (target?: AdminUserRow) => {
    setComposeTarget(target ?? null);
    setComposeTitle('');
    setComposeBody('');
    setComposeOpen(true);
  };

  const submitNotification = async () => {
    if (!token || !composeTitle.trim()) return;
    try {
      await APIService.adminSendNotification(token, {
        title: composeTitle.trim(),
        body: composeBody.trim() || undefined,
        userId: composeTarget?.id,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setComposeOpen(false);
      Alert.alert('sent', composeTarget ? `delivered to @${composeTarget.username}` : 'broadcast queued.');
    } catch (e: any) {
      Alert.alert('failed', e?.message ?? 'unknown');
    }
  };

  const toggleBan = (target: AdminUserRow) => {
    if (!token) return;
    if (target.id === user?.id) {
      Alert.alert("can't ban yourself.");
      return;
    }
    Alert.alert(
      target.banned ? 'unban user?' : 'ban user?',
      `@${target.username}`,
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await APIService.adminSetBan(token, target.id, !target.banned);
              await load();
            } catch (e: any) {
              Alert.alert('failed', e?.message ?? 'unknown');
            }
          },
        },
      ],
    );
  };

  const deleteUser = (target: AdminUserRow) => {
    if (!token) return;
    if (target.id === user?.id) {
      Alert.alert("can't delete yourself.");
      return;
    }
    Alert.alert(
      'delete user?',
      `@${target.username} — this is permanent.`,
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await APIService.adminDeleteUser(token, target.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await load();
              setUserDetailOpen(false);
            } catch (e: any) {
              Alert.alert('failed', e?.message ?? 'unknown');
            }
          },
        },
      ],
    );
  };

  const unlockCamera = (target: AdminUserRow) => {
    if (!token) return;
    Alert.alert(
      'unlock camera?',
      `@${target.username} will be able to take a photo immediately.`,
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'unlock',
          onPress: async () => {
            try {
              await APIService.adminUnlockCamera(token, target.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await load();
              setUserDetailOpen(false);
              Alert.alert('done', 'camera unlocked.');
            } catch (e: any) {
              Alert.alert('failed', e?.message ?? 'unknown');
            }
          },
        },
      ],
    );
  };

  const openUserDetail = (u: AdminUserRow) => {
    setSelectedUser(u);
    setUserDetailOpen(true);
  };

  if (!user?.isAdmin) {
    return (
      <View style={[styles.wrap, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.red }}>forbidden.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.title}>admin</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Stat value={stats?.users} label="users" />
        <Stat value={stats?.admins} label="admins" />
        <Stat value={stats?.openGenesis} label="open" accent={colors.green} />
        <Stat value={stats?.usedGenesis} label="used" accent={colors.textFade} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TabBtn
          label={`reports${reports.filter((r) => r.status === 'pending').length > 0 ? ` · ${reports.filter((r) => r.status === 'pending').length}` : ''}`}
          active={tab === 'reports'}
          onPress={() => setTab('reports')}
        />
        <TabBtn label={`users (${users.length})`} active={tab === 'users'} onPress={() => setTab('users')} />
        <TabBtn label={`codes (${codes.length})`} active={tab === 'codes'} onPress={() => setTab('codes')} />
        <TabBtn label={`notif (${notifications.length})`} active={tab === 'notifications'} onPress={() => setTab('notifications')} />
        <TabBtn label="test" active={tab === 'test'} onPress={() => setTab('test')} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.yellow} />}
      >
        {loading && <ActivityIndicator color={colors.yellow} style={{ marginVertical: 30 }} />}

        {!loading && tab === 'reports' && (
          reports.length === 0 ? (
            <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: 24, fontSize: 12 }}>
              no reports yet.
            </Text>
          ) : reports.map((r) => (
            <View key={r.id} style={[styles.userRow, { gap: 8, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>
                    pack {r.packNumber ? `#${r.packNumber}` : '(deleted)'}
                  </Text>
                  <View
                    style={[
                      styles.adminBadge,
                      r.status === 'pending'
                        ? { backgroundColor: 'rgba(255,69,58,0.18)' }
                        : r.status === 'resolved'
                          ? { backgroundColor: 'rgba(48,209,88,0.18)' }
                          : { backgroundColor: 'rgba(255,255,255,0.06)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.adminBadgeText,
                        {
                          color:
                            r.status === 'pending'
                              ? colors.red
                              : r.status === 'resolved'
                                ? colors.green
                                : colors.textFade,
                        },
                      ]}
                    >
                      {r.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.userMeta, { color: colors.white }]}>{r.reason}</Text>
                <Text style={styles.userMeta}>
                  by @{r.reporterUsername} · {new Date(r.createdAt).toLocaleString()}
                </Text>
                {r.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <Pressable onPress={() => resolveReport(r.id, 'dismiss')} style={styles.actionBtn}>
                      <Text style={styles.actionBtnText}>dismiss</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => resolveReport(r.id, 'resolve')}
                      style={[styles.actionBtn, { backgroundColor: 'rgba(48,209,88,0.12)' }]}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.green }]}>resolve</Text>
                    </Pressable>
                    {r.packId && r.packNumber && (
                      <>
                        <Pressable
                          onPress={() => resetPackTimer(r.packId)}
                          style={[styles.actionBtn, { backgroundColor: 'rgba(255,214,10,0.12)' }]}
                        >
                          <Ionicons name="time-outline" size={11} color={colors.yellow} />
                          <Text style={[styles.actionBtnText, { color: colors.yellow, marginLeft: 4 }]}>reset timer</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => deletePack(r.packId)}
                          style={[styles.actionBtn, { backgroundColor: 'rgba(255,69,58,0.12)' }]}
                        >
                          <Ionicons name="trash-outline" size={11} color={colors.red} />
                          <Text style={[styles.actionBtnText, { color: colors.red, marginLeft: 4 }]}>delete pack</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        {!loading && tab === 'users' && (
          <Pressable onPress={() => openCompose()} style={styles.broadcastBtn}>
            <Ionicons name="megaphone-outline" size={14} color="#000" />
            <Text style={styles.broadcastText}>broadcast notification</Text>
          </Pressable>
        )}

        {!loading && tab === 'users' &&
          users.map((u) => (
            <Pressable key={u.id} onPress={() => openUserDetail(u)} style={styles.userRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>@{u.username}</Text>
                  {u.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>admin</Text>
                    </View>
                  )}
                  {u.isPro && (
                    <View style={[styles.adminBadge, { backgroundColor: 'rgba(255,214,10,0.10)' }]}>
                      <Text style={[styles.adminBadgeText, { color: colors.yellow }]}>pro</Text>
                    </View>
                  )}
                  {u.banned && (
                    <View style={[styles.adminBadge, { backgroundColor: 'rgba(255,69,58,0.18)' }]}>
                      <Text style={[styles.adminBadgeText, { color: colors.red }]}>banned</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userMeta}>
                  {u.email ?? '—'} · code {u.inviteCode}
                </Text>
                <Text style={styles.userMeta}>
                  invited {u.inviteeCount}/{u.inviteSlots} · {new Date(u.joinedAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.miniBtn}>
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.textFade} />
              </View>
            </Pressable>
          ))}

        {!loading && tab === 'codes' && (
          <>
            <PillButton
              variant="yellow"
              label={busy ? 'generating…' : 'generate genesis code'}
              onPress={generateCode}
              disabled={busy}
              style={{ height: 40, marginBottom: 6 }}
            >
              <Ionicons name="add" size={16} color="#000" />
            </PillButton>
            {codes.map((c) => (
              <Pressable key={c.code} onPress={() => copyCode(c.code)} style={styles.codeRow}>
                <Text style={styles.codeText}>{c.code}</Text>
                {c.used ? (
                  <View style={[styles.codePill, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Text style={[styles.codePillText, { color: colors.textFade }]}>used</Text>
                  </View>
                ) : (
                  <View style={[styles.codePill, { backgroundColor: 'rgba(48,209,88,0.15)' }]}>
                    <Text style={[styles.codePillText, { color: colors.green }]}>open</Text>
                  </View>
                )}
                <Ionicons name="copy-outline" size={14} color={colors.textFade} />
              </Pressable>
            ))}
          </>
        )}

        {!loading && tab === 'notifications' && (
          <>
            <Pressable onPress={() => openCompose()} style={styles.broadcastBtn}>
              <Ionicons name="megaphone-outline" size={14} color="#000" />
              <Text style={styles.broadcastText}>send notification</Text>
            </Pressable>
            {notifications.length === 0 ? (
              <Text style={{ color: colors.textDim, textAlign: 'center', marginTop: 24, fontSize: 12 }}>
                no notifications yet.
              </Text>
            ) : (
              notifications.map((n) => (
                <View key={n.id} style={[styles.userRow, { gap: 6, alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.userHeader}>
                      <Text style={styles.userName}>{n.title}</Text>
                      <View
                        style={[
                          styles.adminBadge,
                          n.readAt
                            ? { backgroundColor: 'rgba(48,209,88,0.18)' }
                            : { backgroundColor: 'rgba(255,214,10,0.18)' },
                        ]}
                      >
                        <Text style={[styles.adminBadgeText, { color: n.readAt ? colors.green : colors.yellow }]}>
                          {n.readAt ? 'read' : 'unread'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.userMeta, { color: colors.white }]}>{n.body}</Text>
                    <Text style={styles.userMeta}>
                      {n.username ? `@${n.username}` : 'broadcast'} · {n.type} · {new Date(n.createdAt).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === 'test' && <TestPanel />}
      </ScrollView>

      <Modal
        visible={composeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setComposeOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setComposeOpen(false)} />
          <View style={[styles.modalCard, { paddingBottom: 16 + insets.bottom }]}>
            <Text style={styles.modalTitle}>
              {composeTarget ? `notify @${composeTarget.username}` : 'broadcast notification'}
            </Text>
            <Text style={styles.modalSub}>
              {composeTarget
                ? 'this message goes only to that user.'
                : 'this message goes to every user as a system announcement.'}
            </Text>
            <TextInput
              placeholder="title"
              placeholderTextColor={colors.textFade}
              value={composeTitle}
              onChangeText={setComposeTitle}
              maxLength={80}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="body (optional)"
              placeholderTextColor={colors.textFade}
              value={composeBody}
              onChangeText={setComposeBody}
              maxLength={240}
              multiline
              style={[styles.modalInput, styles.modalBody]}
            />
            <View style={styles.modalRow}>
              <Pressable
                onPress={() => setComposeOpen(false)}
                style={[styles.actionBtn, { flex: 1, justifyContent: 'center', paddingVertical: 12 }]}
              >
                <Text style={styles.actionBtnText}>cancel</Text>
              </Pressable>
              <Pressable
                onPress={submitNotification}
                disabled={!composeTitle.trim()}
                style={[
                  styles.actionBtn,
                  {
                    flex: 1,
                    justifyContent: 'center',
                    paddingVertical: 12,
                    backgroundColor: composeTitle.trim() ? colors.yellow : 'rgba(255,214,10,0.2)',
                  },
                ]}
              >
                <Text style={[styles.actionBtnText, { color: '#000' }]}>send</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* User detail modal */}
      <Modal
        visible={userDetailOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setUserDetailOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setUserDetailOpen(false)} />
          <View style={[styles.modalCard, { paddingBottom: 16 + insets.bottom }]}>
            {selectedUser && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.white, fontSize: 18, fontWeight: '700' }}>
                      {selectedUser.username[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>@{selectedUser.username}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      {selectedUser.isAdmin && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>admin</Text>
                        </View>
                      )}
                      {selectedUser.isPro && (
                        <View style={[styles.adminBadge, { backgroundColor: 'rgba(255,214,10,0.10)' }]}>
                          <Text style={[styles.adminBadgeText, { color: colors.yellow }]}>pro</Text>
                        </View>
                      )}
                      {selectedUser.banned && (
                        <View style={[styles.adminBadge, { backgroundColor: 'rgba(255,69,58,0.18)' }]}>
                          <Text style={[styles.adminBadgeText, { color: colors.red }]}>banned</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <Text style={styles.modalSub}>
                  {selectedUser.email ?? 'no email'} · code {selectedUser.inviteCode}
                </Text>
                <Text style={styles.modalSub}>
                  invited {selectedUser.inviteeCount}/{selectedUser.inviteSlots} · joined {new Date(selectedUser.joinedAt).toLocaleDateString()}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <DetailAction
                    icon="notifications-outline"
                    label="notify"
                    onPress={() => {
                      setUserDetailOpen(false);
                      openCompose(selectedUser);
                    }}
                  />
                  <DetailAction
                    icon="camera-outline"
                    label="unlock camera"
                    onPress={() => unlockCamera(selectedUser)}
                  />
                  <DetailAction
                    icon="flame-outline"
                    label="reset streak"
                    onPress={() => resetStreak(selectedUser)}
                  />
                  <DetailAction
                    icon={selectedUser.isPro ? 'flash' : 'flash-outline'}
                    label={selectedUser.isPro ? 'remove pro' : 'give pro'}
                    color={colors.yellow}
                    onPress={() => {
                      togglePro(selectedUser);
                      setUserDetailOpen(false);
                    }}
                  />
                  <DetailAction
                    icon={selectedUser.isAdmin ? 'shield-outline' : 'shield-checkmark-outline'}
                    label={selectedUser.isAdmin ? 'remove admin' : 'make admin'}
                    color={colors.yellow}
                    onPress={() => {
                      toggleAdmin(selectedUser);
                      setUserDetailOpen(false);
                    }}
                  />
                  <DetailAction
                    icon={selectedUser.banned ? 'lock-open-outline' : 'ban-outline'}
                    label={selectedUser.banned ? 'unban' : 'ban'}
                    color={colors.red}
                    onPress={() => {
                      toggleBan(selectedUser);
                      setUserDetailOpen(false);
                    }}
                  />
                  <DetailAction
                    icon="trash-outline"
                    label="delete user"
                    color={colors.red}
                    onPress={() => deleteUser(selectedUser)}
                  />
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const DetailAction: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}> = ({ icon, label, color, onPress }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const resolved = color ?? colors.white;
  return (
    <Pressable onPress={onPress} style={styles.detailAction}>
      <Ionicons name={icon} size={18} color={resolved} />
      <Text style={[styles.detailActionText, { color: resolved }]}>{label}</Text>
    </Pressable>
  );
};

const TestPanel: React.FC = () => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { token, dailyTopic } = useAppState();
  const [testCode, setTestCode] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [topicInput, setTopicInput] = useState('');

  const setDailyTopic = async () => {
    if (!token || !topicInput.trim()) return;
    try {
      await APIService.adminSetDailyTopic(token, topicInput.trim());
      setTestResult(`daily topic set to: "${topicInput.trim()}"`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTopicInput('');
    } catch (e: any) {
      setTestResult(`failed: ${e?.message ?? 'unknown'}`);
    }
  };

  const generateTestCode = () => {
    const code = `FLASH-${Math.random().toString(36).slice(2, 5).toUpperCase()}-${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
    setTestCode(code);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const testInviteValidation = () => {
    const raw = 'flash_3x8-5s';
    const normalized = `FLASH-${raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(5, 8)}-${raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(8, 10)}`;
    setTestResult(`input: "${raw}"\n→ normalized: "${normalized}"\nvalid: ${normalized.startsWith('FLASH-')}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const testPushNotification = async () => {
    try {
      const { status } = await import('expo-notifications').then((m) => m.requestPermissionsAsync());
      setTestResult(`push permission: ${status}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setTestResult(`push test failed: ${e?.message ?? 'unknown'}`);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.textDim, fontSize: 11, marginBottom: 4 }}>tools for testing app features</Text>

      <PillButton
        variant="dim"
        label="generate test invite code"
        onPress={generateTestCode}
        style={{ height: 40 }}
      >
        <Ionicons name="ticket-outline" size={14} color={colors.white} />
      </PillButton>
      {testCode && (
        <View style={styles.testResult}>
          <Text style={styles.testResultText}>{testCode}</Text>
        </View>
      )}

      <PillButton
        variant="dim"
        label="test invite code normalization"
        onPress={testInviteValidation}
        style={{ height: 40 }}
      >
        <Ionicons name="git-compare-outline" size={14} color={colors.white} />
      </PillButton>

      <PillButton
        variant="dim"
        label="test push notification permission"
        onPress={testPushNotification}
        style={{ height: 40 }}
      >
        <Ionicons name="notifications-outline" size={14} color={colors.white} />
      </PillButton>

      <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 8 }}>
        {dailyTopic ? `current topic: ${dailyTopic.topic}` : 'no daily topic loaded'}
      </Text>
      <TextInput
        value={topicInput}
        onChangeText={setTopicInput}
        placeholder="set today's topic..."
        placeholderTextColor={colors.textDim}
        style={{
          backgroundColor: colors.card,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.white,
          fontSize: 13,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        }}
      />
      <PillButton
        variant="yellow"
        label="set daily topic"
        onPress={setDailyTopic}
        style={{ height: 40 }}
      >
        <Ionicons name="create-outline" size={14} color="#000" />
      </PillButton>

      {testResult && (
        <View style={[styles.testResult, { backgroundColor: 'rgba(255,214,10,0.06)' }]}>
          <Text style={[styles.testResultText, { color: colors.yellow }]}>{testResult}</Text>
        </View>
      )}
    </View>
  );
};

const Stat: React.FC<{ value?: number; label: string; accent?: string }> = ({ value, label, accent }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value ?? '–'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

const TabBtn: React.FC<{ label: string; active: boolean; onPress: () => void }> = ({ label, active, onPress }) => {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabBtnText, active && { color: colors.yellow }]}>{label}</Text>
    </Pressable>
  );
};

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 16, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '800' },
  statLabel: { color: colors.textDim, fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabBtnActive: { backgroundColor: 'rgba(255,214,10,0.12)' },
  tabBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
  },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { color: colors.white, fontSize: 13, fontWeight: '700' },
  userMeta: { color: colors.textFade, fontSize: 10, marginTop: 2 },
  adminBadge: {
    backgroundColor: 'rgba(255,214,10,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminBadgeText: { color: colors.yellow, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  miniBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  broadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.yellow,
    height: 40,
    borderRadius: 10,
    marginBottom: 6,
  },
  broadcastText: { color: '#000', fontSize: 13, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '800' },
  modalSub: { color: colors.textDim, fontSize: 11 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  modalBody: { minHeight: 60, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  codeText: {
    flex: 1,
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  codePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  codePillText: { fontSize: 10, fontWeight: '700' },
  testResult: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
  },
  testResultText: { color: colors.white, fontSize: 11, lineHeight: 16 },
  detailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  detailActionText: { fontSize: 11, fontWeight: '600' },
});
