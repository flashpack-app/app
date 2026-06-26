import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Pack, User, InviteSlot, CommentMessage } from '../types/models';
import { mockPacks } from '../data/mock';
import { Session, loadSession, saveSession, clearSession } from '../services/storage';
import { APIService } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';

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
  signIn: (s: Session) => Promise<void>;
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
  addReaction: (packId: string, emoji: string) => void;
  addComment: (packId: string, msg: CommentMessage) => void;
  updateAvatar: (uri: string) => void;
  updateProBorder: (color: string | undefined) => Promise<void>;
  revertPhoto: (photoId: string) => Promise<void>;
  refreshStreak: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBooting, setBooting] = useState(true);
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

  useEffect(() => {
    (async () => {
      const s = await loadSession();
      if (s) {
        setUser(s.user);
        setToken(s.token);
        if (s.user.lastPostAt) setLastPostAt(s.user.lastPostAt);
        try {
          const fresh = await APIService.getMe(s.token);
          setUser(fresh);
          if (fresh.lastPostAt) {
            setLastPostAt(fresh.lastPostAt);
            setHasPostedFirstPack(true);
          }
          await saveSession({ token: s.token, user: fresh });
          registerForPushNotificationsAsync(s.token).catch(() => {});
        } catch {}
      }
      try {
        const topic = await APIService.getDailyTopic();
        setDailyTopic(topic);
      } catch {}
      setBooting(false);
    })();
  }, []);

  const value = useMemo<AppStateValue>(
    () => ({
      user,
      token,
      isAuthenticated: user !== null && token !== null,
      isBooting,
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
      async signIn(s) {
        setUser(s.user);
        setToken(s.token);
        await saveSession(s);
        registerForPushNotificationsAsync(s.token).catch(() => {});
      },
      async signOut() {
        setUser(null);
        setToken(null);
        setLastPostAt(null);
        setLastPostedPhotoId(null);
        setPacks([]);
        setDiscoverPacks([]);
        setReactions({});
        setComments({});
        await clearSession();
      },
      async refreshUser() {
        if (!token) return;
        try {
          const fresh = await APIService.getMe(token);
          setUser(fresh);
          await saveSession({ token, user: fresh });
        } catch {}
      },
      async refreshPacks() {
        if (!token) return;
        try {
          const loaded = await APIService.getPacks(token);
          setPacks(loaded);
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
        } catch {}
      },
      async refreshDiscover() {
        if (!token) return;
        try {
          const loaded = await APIService.getDiscover(token);
          setDiscoverPacks(loaded);
        } catch {}
      },
      markAllRead: () => setUnreadCount(0),
      markOneRead: () => setUnreadCount((c) => Math.max(0, c - 1)),
      addPack: (p) => setPacks((prev) => [p, ...prev]),
      updatePack: (id, patch) =>
        setPacks((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      markFirstPackPosted: () => setHasPostedFirstPack(true),
      setLastPostAt: (iso) => setLastPostAt(iso),
      setLastPostedPhotoId: (id) => setLastPostedPhotoId(id),
      addReaction: (packId, emoji) => {
        setReactions((prev) => {
          const existing = prev[packId] ?? [];
          if (existing.length >= 5) return prev;
          const userId = user?.id ?? 'anon';
          if (existing.some((r) => r.userId === userId)) return prev;
          return { ...prev, [packId]: [...existing, { userId, emoji, sentAt: new Date().toISOString() }] };
        });
        if (token) {
          APIService.addReaction(token, packId, emoji).catch(() => {});
        }
      },
      addComment: (packId, msg) => {
        setComments((prev) => ({ ...prev, [packId]: [...(prev[packId] ?? []), msg] }));
        if (token) {
          APIService.addComment(token, packId, msg.text).catch(() => {});
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
        } catch (e) {
          console.error('updateAvatar failed:', e);
        }
      },
      async updateProBorder(color: string | undefined) {
        if (!token || !user) return;
        const next = { ...user, proBorder: color };
        setUser(next);
        try {
          await APIService.updateProfile(token, { proBorder: color });
          await saveSession({ token, user: next });
        } catch {}
      },
      async revertPhoto(photoId) {
        if (!token) return;
        await APIService.revertPhoto(token, photoId);
        setLastPostAt(null);
        setLastPostedPhotoId(null);
        setHasPostedFirstPack(false);
      },
      async refreshStreak() {
        if (!token) return;
        try {
          const s = await APIService.getStreak(token);
          setStreak(s);
          if (s.lastPostAt) setLastPostAt(s.lastPostAt);
          setUser((prev) => (prev ? { ...prev, streakDays: s.streakDays } : prev));
        } catch {}
      },
      async refreshNotifications() {
        if (!token) return;
        try {
          const list = await APIService.getNotifications(token);
          setUnreadCount(list.filter((n) => !n.readAt).length);
        } catch {}
      },
    }),
    [user, token, isBooting, packs, discoverPacks, hasPostedFirstPack, lastPostAt, lastPostedPhotoId, unreadCount, reactions, comments, streak, dailyTopic],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
