import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Pack, User, InviteSlot, CommentMessage } from '../types/models';
import { mockPacks } from '../data/mock';
import { Session, loadSession, saveSession, clearSession, loadLastStreakDays, saveLastStreakDays, loadCachedPacks, saveCachedPacks, loadCachedDiscoverPacks, saveCachedDiscoverPacks, clearPacksCache } from '../services/storage';
import { APIService } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';
import { posthog } from '../config/posthog';

interface PackReaction {
  userId: string;
  emoji: string;
  sentAt: string;
}

interface StreakInfo {
  streakDays: number;
  lastPostAt: string | null;
  history: any[];
}

interface AppStateValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isBooting: boolean;
  isConnected: boolean;
  packs: Pack[];
  discoverPacks: Pack[];
  hasPostedFirstPack: boolean;
  lastPostAt: string | null;
  lastPostedPhotoId: string | null;
  unreadCount: number;
  reactions: Record<string, PackReaction[]>;
  comments: Record<string, CommentMessage[]>;
  streak: StreakInfo | null;
  dailyTopic: { topic: string; date: string } | null;
  isOnboarding: boolean;
  streakAtRisk: boolean;
  streakAdvancedTo: number | null;
  liveNotification: {
    title: string;
    body?: string;
    type?: string;
    packId?: string;
  } | null;
  // Per-fetch failure flags (keyed by 'packs' | 'discover' | 'streak' |
  // 'notifications'); true after a load fails, cleared on the next success.
  // Surfaces an inline error + retry instead of silently swallowing the error.
  loadErrors: Record<string, boolean>;
  setIsOnboarding: (val: boolean) => void;
  setIsConnected: (val: boolean) => void;
  clearStreakAdvanced: () => void;
  setLiveNotification: (notification: { title: string; body?: string; type?: string; packId?: string } | null) => void;
  signIn: (s: Session, onboarding?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshPacks: () => Promise<void>;
  refreshDiscover: () => Promise<void>;
  markAllRead: () => void;
  markOneRead: () => void;
  addPack: (pack: Pack) => void;
  updatePack: (id: string, patch: Partial<Pack>) => void;
  markFirstPackPosted: () => void;
  setLastPostAt: (iso: string | null) => void;
  setLastPostedPhotoId: (id: string | null) => void;
  addReaction: (packId: string, emoji: string) => Promise<void>;
  addComment: (packId: string, msg: CommentMessage) => Promise<void>;
  updateAvatar: (uri: string) => Promise<void>;
  updateProBorder: (color: string | undefined) => Promise<void>;
  revertPhoto: (photoId: string) => Promise<void>;
  refreshStreak: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  awardPongBadge: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBooting, setBooting] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [discoverPacks, setDiscoverPacks] = useState<Pack[]>([]);
  const [hasPostedFirstPack, setHasPostedFirstPack] = useState(false);
  const [lastPostAt, setLastPostAt] = useState<string | null>(null);
  const [lastPostedPhotoId, setLastPostedPhotoId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [reactions, setReactions] = useState<Record<string, PackReaction[]>>({});
  const [comments, setComments] = useState<Record<string, CommentMessage[]>>({});
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [dailyTopic, setDailyTopic] = useState<{ topic: string; date: string } | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [streakAdvancedTo, setStreakAdvancedTo] = useState<number | null>(null);
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
  const [liveNotificationState, setLiveNotificationState] = useState<{
    title: string;
    body?: string;
    type?: string;
    packId?: string;
  } | null>(null);
  const markLoad = (key: string, failed: boolean) =>
    setLoadErrors((prev) => (prev[key] === failed ? prev : { ...prev, [key]: failed }));

  // Compute streak at-risk state: server uses 48h window, so at-risk when > 24h since last post
  const streakAtRisk = useMemo(() => {
    if (!lastPostAt || !streak || streak.streakDays < 1) return false;
    const hoursSinceLastPost = (Date.now() - new Date(lastPostAt).getTime()) / (1000 * 60 * 60);
    // At risk if more than 24 hours have passed (halfway to 48h cutoff)
    return hoursSinceLastPost > 24;
  }, [lastPostAt, streak]);

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s) {
        setUser(s.user);
        setToken(s.token);
        if (s.user.lastPostAt) setLastPostAt(s.user.lastPostAt);
        posthog.identify(s.user.id, {
          $set: { username: s.user.username, is_pro: s.user.isPro, country: s.user.country, city: s.user.city },
          $set_once: { joined_at: s.user.joinedAt, ...(s.user.invitedBy ? { invited_by: s.user.invitedBy } : {}) },
        });
        
        // Load offline cache immediately to show content under 50ms
        const [cachedPacks, cachedDiscover] = await Promise.all([
          loadCachedPacks(),
          loadCachedDiscoverPacks(),
        ]);
        if (cachedPacks) setPacks(cachedPacks);
        if (cachedDiscover) setDiscoverPacks(cachedDiscover);
      }
      
      // Clear boot immediately after local session and cache load
      setBooting(false);

      // Concurrently run network calls in background after boot clears
      if (s) {
        Promise.all([
          APIService.getMe(s.token).then(async (fresh) => {
            setUser(fresh);
            if (fresh.lastPostAt) {
              setLastPostAt(fresh.lastPostAt);
              setHasPostedFirstPack(true);
            }
            await saveSession({ token: s.token, user: fresh });
            registerForPushNotificationsAsync(s.token).catch((error) => {
              console.warn('push notification registration failed during boot:', error);
            });
          }),
          APIService.getDailyTopic().then((topic) => {
            if (topic) setDailyTopic(topic);
          }).catch((error) => {
            console.warn('daily topic load failed during boot:', error);
          }),
          APIService.getPacks(s.token).then(async (loaded) => {
            setPacks(loaded);
            await saveCachedPacks(loaded);
            const cmtMap: Record<string, CommentMessage[]> = {};
            for (const p of loaded) {
              if (p.comment?.messages?.length) cmtMap[p.id] = p.comment.messages as any;
            }
            if (Object.keys(cmtMap).length) {
              setComments((prev) => ({ ...prev, ...cmtMap }));
            }
            setReactions((prev) => {
              const next: Record<string, PackReaction[]> = { ...prev };
              for (const p of loaded) {
                const server = (p.reactions ?? []).map((r: any) => ({
                  userId: r.userId,
                  emoji: r.emoji,
                  sentAt: new Date().toISOString(),
                }));
                const key = (r: PackReaction) => `${r.userId}:${r.emoji}`;
                const serverKeys = new Set(server.map(key));
                const local = prev[p.id] ?? [];
                const extra = local.filter((r) => !serverKeys.has(key(r)));
                next[p.id] = [...server, ...extra];
              }
              return next;
            });
            if (loaded.length > 0) setHasPostedFirstPack(true);
            markLoad('packs', false);
          }).catch((e) => {
            console.warn('boot packs load failed:', e);
            markLoad('packs', true);
          }),
          APIService.getDiscover(s.token).then(async (loaded) => {
            setDiscoverPacks(loaded);
            await saveCachedDiscoverPacks(loaded);
            const cmtMap: Record<string, CommentMessage[]> = {};
            for (const p of loaded) {
              if (p.comment?.messages?.length) cmtMap[p.id] = p.comment.messages as any;
            }
            if (Object.keys(cmtMap).length) {
              setComments((prev) => ({ ...prev, ...cmtMap }));
            }
            setReactions((prev) => {
              const next: Record<string, PackReaction[]> = { ...prev };
              for (const p of loaded) {
                const server = (p.reactions ?? []).map((r: any) => ({
                  userId: r.userId,
                  emoji: r.emoji,
                  sentAt: new Date().toISOString(),
                }));
                const key = (r: PackReaction) => `${r.userId}:${r.emoji}`;
                const serverKeys = new Set(server.map(key));
                const local = prev[p.id] ?? [];
                const extra = local.filter((r) => !serverKeys.has(key(r)));
                next[p.id] = [...server, ...extra];
              }
              return next;
            });
            markLoad('discover', false);
          }).catch((e) => {
            console.warn('boot discover load failed:', e);
            markLoad('discover', true);
          }),
          APIService.getNotifications(s.token).then((list) => {
            setUnreadCount(list.filter((n) => !n.readAt).length);
            markLoad('notifications', false);
          }).catch((e) => {
            console.warn('boot notifications load failed:', e);
            markLoad('notifications', true);
          }),
          APIService.getStreak(s.token).then((st) => {
            setStreak(st);
            if (st.lastPostAt) setLastPostAt(st.lastPostAt);
            setUser((prev) => (prev ? { ...prev, streakDays: st.streakDays } : prev));
            markLoad('streak', false);
          }).catch((e) => {
            console.warn('boot streak load failed:', e);
            markLoad('streak', true);
          }),
        ]).catch((e) => {
          console.warn('failed background fetch on boot:', e);
        });
      } else {
        // Still fetch daily topic even without session
        try {
          const topic = await APIService.getDailyTopic();
          setDailyTopic(topic);
        } catch (e) {
          console.warn('failed to load daily topic:', e);
        }
      }
    })();
  }, []);

  // Check streak advancement after streak is loaded
  useEffect(() => {
    (async () => {
      if (streak && token) {
        const lastStreakDays = await loadLastStreakDays();
        const currentStreakDays = streak.streakDays;
        if (lastStreakDays !== null && currentStreakDays > lastStreakDays) {
          setStreakAdvancedTo(currentStreakDays);
        }
        await saveLastStreakDays(currentStreakDays);
      }
    })();
  }, [streak, token]);

  // Stable callbacks for functions used in useEffect dependencies
  const refreshPacks = useCallback(async () => {
    if (!token) return;
    try {
      const loaded = await APIService.getPacks(token);
      setPacks(loaded);
      await saveCachedPacks(loaded);
      // hydrate comments & reactions from server, merging so local optimistic
      // updates aren't lost if the server hasn't seen them yet.
      const cmtMap: Record<string, CommentMessage[]> = {};
      for (const p of loaded) {
        if (p.comment?.messages?.length) cmtMap[p.id] = p.comment.messages as any;
      }
      if (Object.keys(cmtMap).length) {
        setComments((prev) => ({ ...prev, ...cmtMap }));
      }
      setReactions((prev) => {
        const next: Record<string, PackReaction[]> = { ...prev };
        for (const p of loaded) {
          const server = (p.reactions ?? []).map((r: any) => ({
            userId: r.userId,
            emoji: r.emoji,
            sentAt: new Date().toISOString(),
          }));
          const key = (r: PackReaction) => `${r.userId}:${r.emoji}`;
          const serverKeys = new Set(server.map(key));
          const local = prev[p.id] ?? [];
          const extra = local.filter((r) => !serverKeys.has(key(r)));
          next[p.id] = [...server, ...extra];
        }
        return next;
      });
      if (loaded.length > 0) setHasPostedFirstPack(true);
      markLoad('packs', false);
    } catch (e) {
      console.warn('refreshPacks failed:', e);
      markLoad('packs', true);
    }
  }, [token]);

  const refreshDiscover = useCallback(async () => {
    if (!token) return;
    try {
      const loaded = await APIService.getDiscover(token);
      setDiscoverPacks(loaded);
      await saveCachedDiscoverPacks(loaded);
      const cmtMap: Record<string, CommentMessage[]> = {};
      for (const p of loaded) {
        if (p.comment?.messages?.length) cmtMap[p.id] = p.comment.messages as any;
      }
      if (Object.keys(cmtMap).length) {
        setComments((prev) => ({ ...prev, ...cmtMap }));
      }
      setReactions((prev) => {
        const next: Record<string, PackReaction[]> = { ...prev };
        for (const p of loaded) {
          const server = (p.reactions ?? []).map((r: any) => ({
            userId: r.userId,
            emoji: r.emoji,
            sentAt: new Date().toISOString(),
          }));
          const key = (r: PackReaction) => `${r.userId}:${r.emoji}`;
          const serverKeys = new Set(server.map(key));
          const local = prev[p.id] ?? [];
          const extra = local.filter((r) => !serverKeys.has(key(r)));
          next[p.id] = [...server, ...extra];
        }
        return next;
      });
      markLoad('discover', false);
    } catch (e) {
      console.warn('refreshDiscover failed:', e);
      markLoad('discover', true);
    }
  }, [token]);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const list = await APIService.getNotifications(token);
      setUnreadCount(list.filter((n) => !n.readAt).length);
      markLoad('notifications', false);
    } catch (e) {
      console.warn('refreshNotifications failed:', e);
      markLoad('notifications', true);
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const fresh = await APIService.getMe(token);
      setUser(fresh);
      await saveSession({ token, user: fresh });
    } catch (e) {
      console.warn('refreshUser failed:', e);
    }
  }, [token]);

  const refreshStreak = useCallback(async () => {
    if (!token) return;
    try {
      const s = await APIService.getStreak(token);
      setStreak(s);
      if (s.lastPostAt) setLastPostAt(s.lastPostAt);
      setUser((prev) => (prev ? { ...prev, streakDays: s.streakDays } : prev));
      markLoad('streak', false);
    } catch (e) {
      console.warn('refreshStreak failed:', e);
      markLoad('streak', true);
    }
  }, [token]);

  const setLiveNotification = useCallback((notification: { title: string; body?: string; type?: string; packId?: string } | null) => {
    setLiveNotificationState(notification);
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      user,
      token,
      isAuthenticated: user !== null && token !== null,
      isBooting,
      isConnected,
      packs,
      discoverPacks,
      hasPostedFirstPack,
      lastPostAt,
      lastPostedPhotoId,
      unreadCount,
      reactions,
      comments,
      streak,
      dailyTopic,
      isOnboarding,
      streakAtRisk,
      streakAdvancedTo,
      liveNotification: liveNotificationState,
      loadErrors,
      setIsOnboarding,
      setIsConnected,
      clearStreakAdvanced: () => setStreakAdvancedTo(null),
      setLiveNotification,
      async signIn(s, onboarding = false) {
        setUser(s.user);
        setToken(s.token);
        setIsOnboarding(onboarding);
        await saveSession(s);
        registerForPushNotificationsAsync(s.token).catch((error) => {
          console.warn('push notification registration failed after sign-in:', error);
        });
        // Identify the user in PostHog so all subsequent events are tied to them
        posthog.identify(s.user.id, {
          username: s.user.username,
          ...(s.user.email ? { email: s.user.email } : {}),
          isPro: s.user.isPro,
        });
      },
      async signOut() {
        posthog.reset();
        setUser(null);
        setToken(null);
        setLastPostAt(null);
        setLastPostedPhotoId(null);
        setPacks([]);
        setDiscoverPacks([]);
        setReactions({});
        setComments({});
        await Promise.all([clearSession(), clearPacksCache()]);
      },
      refreshUser,
      refreshPacks,
      refreshDiscover,
      markAllRead: () => setUnreadCount(0),
      markOneRead: () => setUnreadCount((c) => Math.max(0, c - 1)),
      addPack: (p) => setPacks((prev) => [p, ...prev]),
      updatePack: (id, patch) =>
        setPacks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      markFirstPackPosted: () => setHasPostedFirstPack(true),
      setLastPostAt: (iso) => setLastPostAt(iso),
      setLastPostedPhotoId: (id) => setLastPostedPhotoId(id),
      async addReaction(packId, emoji) {
        setReactions((prev) => {
          const existing = prev[packId] ?? [];
          const userId = user?.id ?? 'anon';
          if (existing.length >= 5 || existing.some((r) => r.userId === userId)) return prev;
          const reaction = { userId, emoji, sentAt: new Date().toISOString() };
          posthog.capture('reaction_sent', {
            pack_id: packId,
            emoji,
          });
          if (!token) return prev;
          APIService.addReaction(token, packId, emoji).catch((error) => {
            setReactions((prev2) => ({
              ...prev2,
              [packId]: (prev2[packId] ?? []).filter((item) => item !== reaction),
            }));
            console.warn('addReaction failed:', error);
          });
          return { ...prev, [packId]: [...existing, reaction] };
        });
      },
      async addComment(packId, msg) {
        setComments((prev) => ({ ...prev, [packId]: [...(prev[packId] ?? []), msg] }));
        if (!token) return;
        try {
          await APIService.addComment(token, packId, msg.text);
        } catch (error) {
          setComments((prev) => ({
            ...prev,
            [packId]: (prev[packId] ?? []).filter((comment) => comment.id !== msg.id),
          }));
          console.warn('addComment failed:', error);
          throw error;
        }
      },
      async updateAvatar(uri) {
        if (!token || !user) return;
        try {
          const avatarUrl = await APIService.uploadAvatar(token, uri);
          const next = { ...user, avatarUrl };
          setUser(next);
          setPacks((prev) =>
            prev.map((pack) => ({
              ...pack,
              members: pack.members.map((m) => (m.id === next.id ? { ...m, avatarUrl } : m)),
            }))
          );
          await saveSession({ token, user: next });
        } catch (error) {
          console.error('updateAvatar failed:', error);
          throw error;
        }
      },
      async updateProBorder(color: string | undefined) {
        if (!token || !user) return;
        try {
          const next = await APIService.updateProfile(token, { proBorder: color });
          setUser(next);
          await saveSession({ token, user: next });
        } catch (error) {
          console.warn('updateProBorder failed:', error);
          throw error;
        }
      },
      async revertPhoto(photoId) {
        if (!token) return;
        await APIService.revertPhoto(token, photoId);
        setLastPostAt(null);
        setLastPostedPhotoId(null);
        setHasPostedFirstPack(false);
      },
      refreshStreak,
      refreshNotifications,
      async awardPongBadge() {
        if (!user || !token) return;
        try {
          const next = await APIService.updateProfile(token, { hasPongBadge: true });
          setUser(next);
          await saveSession({ token, user: next });
        } catch (error) {
          console.error('awardPongBadge failed:', error);
          throw error;
        }
      },
    }),
    [user, token, isBooting, isConnected, isOnboarding, setIsOnboarding, refreshPacks, refreshDiscover, refreshNotifications, refreshUser, refreshStreak, setLiveNotification],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
