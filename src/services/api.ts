import { API_URL } from '../config';
import { Pack, User, InviteSlot, VibeFilter, AdminStats, AdminUserRow, GenesisCode } from '../types/models';
import { mockPacks } from '../data/mock';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

class HTTPError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(typeof body?.error === 'string' ? body.error : `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

class ResponseParseError extends Error {
  path: string;
  cause: unknown;

  constructor(path: string, cause: unknown) {
    super(`Invalid JSON response from ${path}`);
    this.path = path;
    this.cause = cause;
  }
}

async function http<T>(
  path: string,
  opts: { method?: string; body?: any; token?: string | null; headers?: Record<string, string> } = {},
): Promise<T> {
  const isFormData = opts.body instanceof FormData;
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
    },
    body: isFormData ? opts.body : (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  let json: any = null;
  let parseError: unknown;
  try {
    json = await res.json();
  } catch (e) {
    parseError = e;
  }
  if (!res.ok) throw new HTTPError(res.status, json);
  if (parseError && res.status !== 204) throw new ResponseParseError(path, parseError);
  return json as T;
}

// Photo URLs from the server may be relative (e.g. "/photos/:id/raw"); turn them
// into absolute URLs the image loader can fetch.
function absoluteUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (u.startsWith('http') || u.startsWith('data:')) return u;
  if (u.startsWith('/')) return `${API_URL}${u}`;
  return u; // legacy local file path
}

// Avatars live at a stable per-user URL (/avatars/:id), so a device that cached
// an older version (previously served as immutable) would keep showing it even
// after the user changes their photo. We bust that cache once per app launch.
const AVATAR_CACHE_BUST = Date.now();
function avatarUrlAbsolute(u?: string | null): string | undefined {
  const abs = absoluteUrl(u);
  if (!abs || abs.startsWith('data:')) return abs;
  const sep = abs.includes('?') ? '&' : '?';
  return `${abs}${sep}t=${AVATAR_CACHE_BUST}`;
}

function mapUser(row: any): User {
  return {
    id: row.id,
    username: row.username,
    phoneNumber: row.phone ?? '',
    email: row.email ?? undefined,
    isAdmin: !!row.is_admin,
    banned: !!row.banned,
    avatarUrl: avatarUrlAbsolute(row.avatarUrl ?? row.avatar_url) ?? undefined,
    inviteCode: row.invite_code,
    invitedBy: row.invited_by_username || undefined,
    inviteSlots: row.invite_slots,
    streakDays: row.streak_days ?? 0,
    lastPostAt: row.last_post_at ?? undefined,
    isPro: !!row.is_pro,
    proBorder: row.proBorder ?? row.pro_border ?? undefined,
    vibeProfile: { filterUsage: { raw: 0, cinema: 0, maku: 0, neagh: 0, ontario: 0, summer: 0, bonboa: 0, daisy: 0, earth: 0, hibiscus: 0 } },
    joinedAt: row.created_at,
    city: row.city ?? 'unknown',
    country: row.country ?? '',
    flag: row.flag ?? '🌍',
    packs: 0,
    countries: 0,
    saved: 0,
    packedWith: [],
    hasPongBadge: !!(row.hasPongBadge ?? row.has_pong_badge),
  };
}

// Backend pack payloads -> our Pack model.
function mapPack(p: any): Pack {
  return {
    id: p.id,
    number: p.number,
    members: (p.members ?? []).map((m: any) => ({ ...m, avatarUrl: avatarUrlAbsolute(m.avatarUrl) ?? m.avatarUrl })),
    photos: (p.photos ?? []).map((ph: any) => ({
      ...ph,
      imageURL: absoluteUrl(ph.imageURL),
      videoURL: absoluteUrl(ph.videoURL),
    })),
    chemistryScore: p.chemistryScore ?? 0,
    createdAt: p.createdAt,
    expiresAt: p.expiresAt,
    isSaved: p.status === 'saved',
    status: p.status,
    countriesCount: p.countriesCount ?? 1,
    apartMinutes: p.apartMinutes ?? 0,
    reactions: p.reactions ?? [],
    screenshots: p.screenshots ?? [],
    packType: p.packType === 'duet' ? 'duet' : 'squad',
    comment: p.comments?.length
      ? {
          messages: p.comments.map((c: any) => ({
            ...c,
            avatarUrl: avatarUrlAbsolute(c.avatarUrl) ?? c.avatarUrl,
          })),
          isLocked: !p.allPosted,
        }
      : undefined,
  };
}

export interface VerifyResult {
  valid: boolean;
  kind?: 'genesis' | 'user';
  reason?: string;
}

export interface LineageNode {
  id: string;
  username: string;
  city: string;
  flag: string;
  isPro: boolean;
  joinedAt: string;
  invitedBy?: string;
  avatarUrl?: string;
  depth: number;
}

export interface Lineage {
  self: LineageNode;
  ancestors: LineageNode[];
  descendants: LineageNode[];
}

export const APIService = {
  async login(username: string): Promise<{ user: User; token: string }> {
    const res = await http<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: { username },
    });
    return { user: mapUser(res.user), token: res.token };
  },

  async verifyInvite(code: string): Promise<VerifyResult> {
    return http<VerifyResult>('/invite/verify', { method: 'POST', body: { code } });
  },

  async redeemInvite(
    code: string,
    username: string,
    extras?: { city?: string; country?: string; flag?: string },
  ): Promise<{ user: User; token: string }> {
    const res = await http<{ user: any; token: string }>('/invite/redeem', {
      method: 'POST',
      body: { code, username, ...extras },
    });
    return { user: mapUser(res.user), token: res.token };
  },

  async getMe(token: string): Promise<User> {
    const res = await http<{ user: any }>('/me', { token });
    return mapUser(res.user);
  },

  async getInviteSlots(token: string): Promise<{ code: string; slots: InviteSlot[] }> {
    return http('/invite/slots', { token });
  },

  async getLineage(token: string): Promise<Lineage> {
    const res = await http<Lineage>('/me/lineage', { token });
    const abs = (n: LineageNode): LineageNode => ({ ...n, avatarUrl: avatarUrlAbsolute(n.avatarUrl) });
    return { self: abs(res.self), ancestors: res.ancestors.map(abs), descendants: res.descendants.map(abs) };
  },

  // OTP is keyed on the username (login) or invite code (signup). When the
  // server has no SMS provider configured it returns the code as devCode so
  // the flow still works end-to-end.
  async sendOTP(params: { username?: string; inviteCode?: string; phone?: string; email?: string; isLogin?: boolean }): Promise<{ devCode?: string }> {
    return http('/auth/otp/send', { method: 'POST', body: params });
  },

  async verifyOTP(params: { username?: string; inviteCode?: string; code: string; phone?: string; email?: string; isLogin?: boolean; city?: string; country?: string; flag?: string }): Promise<{ user?: User; token?: string }> {
    const res = await http<{ ok: boolean; user?: any; token?: string }>('/auth/otp/verify', {
      method: 'POST',
      body: params,
    });
    return { user: res.user ? mapUser(res.user) : undefined, token: res.token };
  },

  async uploadPhoto(
    token: string,
    uri: string | null,
    filter: VibeFilter,
    videoUri?: string | null,
    packType?: 'duet' | 'squad',
  ): Promise<{ photoId: string; packId: string; packNumber: number }> {
    // Keep media as files and let the server's Multer endpoint handle them.
    // This avoids base64's ~33% size overhead and the JSON body-size limit.
    let uploadUri = uri;
    if (uri) {
      try {
        const result = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 2048 } }],
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
        );
        if (result?.uri) uploadUri = result.uri;
      } catch (err) {
        console.error('Error manipulating image in uploadPhoto:', err);
        // The original camera file is still a valid multipart fallback.
      }
    }

    if (!uploadUri) throw new Error('failed_to_prepare_photo');

    const form = new FormData();
    form.append('photo', {
      uri: uploadUri,
      name: 'flash.jpg',
      type: 'image/jpeg',
    } as any);
    form.append('filter', filter);
    form.append('packType', packType ?? 'squad');

    if (videoUri) {
      const ext = videoUri.split('.').pop()?.toLowerCase();
      const isQuickTime = ext === 'mov';
      form.append('video', {
        uri: videoUri,
        name: isQuickTime ? 'flash-live.mov' : 'flash-live.mp4',
        type: isQuickTime ? 'video/quicktime' : 'video/mp4',
      } as any);
    }

    return http('/photos', {
      method: 'POST',
      token,
      body: form,
    }) as Promise<{ photoId: string; packId: string; packNumber: number }>;
  },

  async revertPhoto(token: string, photoId: string): Promise<void> {
    await http(`/photos/${photoId}/revert`, { method: 'POST', token });
  },

  async getPacks(token: string): Promise<Pack[]> {
    const res = await http<{ packs: any[] }>('/packs', { token });
    return res.packs.map(mapPack);
  },

  // Random recent packs from around the globe the user is not part of.
  async getDiscover(token: string): Promise<Pack[]> {
    const res = await http<{ packs: any[] }>('/packs/discover', { token });
    return res.packs.map(mapPack);
  },

  async getPack(token: string, id: string): Promise<Pack | undefined> {
    const res = await http<{ pack: any }>(`/packs/${id}`, { token });
    return res.pack;
  },

  async addReaction(token: string, packId: string, emoji: string): Promise<void> {
    await http(`/packs/${packId}/react`, { method: 'POST', token, body: { emoji } });
  },

  async addComment(token: string, packId: string, text: string): Promise<void> {
    await http(`/packs/${packId}/comment`, { method: 'POST', token, body: { text } });
  },

  async savePack(_packId: string) {},
  async reportPack(token: string, packId: string, reason: string): Promise<void> {
    await http('/reports', { method: 'POST', token, body: { packId, reason } });
  },
  async reportComment(token: string, commentId: string, reason: string): Promise<void> {
    await http('/comment-reports', { method: 'POST', token, body: { commentId, reason } });
  },
  async reportUser(token: string, targetUserId: string, reason: string): Promise<void> {
    await http('/user-reports', { method: 'POST', token, body: { targetUserId, reason } });
  },
  async updateProfile(token: string, patch: { avatarUrl?: string; isPro?: boolean; proBorder?: string; hasPongBadge?: boolean }): Promise<User> {
    const res = await http<{ user: any }>('/me', { method: 'PATCH', token, body: patch });
    return mapUser(res.user);
  },

  async uploadAvatar(token: string, uri: string): Promise<string> {
    let imageData: string | undefined;
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 768 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      );
      if (result?.base64) imageData = result.base64;
    } catch (e) {
      console.warn('avatar manipulator failed:', e);
      /* fall back */
    }
    if (!imageData) {
      // Try reading file directly as base64
      try {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        imageData = b64;
      } catch (e) {
        console.warn('avatar read failed:', e);
      }
    }
    if (!imageData) throw new Error('failed_to_read_avatar');
    const res = await http<{ avatarUrl: string }>('/me/avatar', {
      method: 'POST',
      token,
      body: { imageData: imageData.replace(/^data:image\/\w+;base64,/, ''), imageMime: 'image/jpeg' },
    });
    // Make it absolute and append a fresh cache-buster so a just-changed avatar
    // replaces any previously cached image.
    const abs = avatarUrlAbsolute(res.avatarUrl) ?? res.avatarUrl;
    if (!abs) throw new Error('missing_avatar_url');
    const sep = abs.includes('?') ? '&' : '?';
    return `${abs}${sep}cb=${Date.now()}`;
  },
  async logScreenshot(token: string, packId: string): Promise<void> {
    await http('/screenshot', { method: 'POST', token, body: { packId } });
  },

  async getStreak(token: string): Promise<{ streakDays: number; lastPostAt: string | null; history: any[] }> {
    return http('/streak', { token });
  },
  async useStreakInsurance(token: string): Promise<{ ok: boolean; message: string }> {
    return http('/streak/insurance', { method: 'POST', token });
  },

  // ---- admin ----
  async adminStats(token: string): Promise<AdminStats> {
    return http<AdminStats>('/admin/stats', { token });
  },
  async adminUsers(token: string): Promise<AdminUserRow[]> {
    const res = await http<{ users: any[] }>('/admin/users', { token });
    return res.users.map((u) => ({ ...mapUser(u), inviteeCount: parseInt(u.invitee_count ?? '0', 10) }));
  },
  async adminDeleteUser(token: string, id: string): Promise<void> {
    await http(`/admin/users/${id}`, { method: 'DELETE', token });
  },
  async adminSetAdmin(token: string, id: string, value: boolean): Promise<User> {
    const res = await http<{ user: any }>(`/admin/users/${id}/admin`, {
      method: 'POST',
      body: { value },
      token,
    });
    return mapUser(res.user);
  },
  async adminListGenesis(token: string): Promise<GenesisCode[]> {
    const res = await http<{ codes: GenesisCode[] }>('/admin/genesis', { token });
    return res.codes;
  },
  async adminCreateGenesis(token: string, count = 1): Promise<string[]> {
    const res = await http<{ created: string[] }>('/admin/genesis', {
      method: 'POST',
      body: { count },
      token,
    });
    return res.created;
  },
  async adminListReports(token: string): Promise<AdminReport[]> {
    const res = await http<{ reports: any[] }>('/admin/reports', { token });
    return res.reports.map((r) => ({
      id: r.id,
      packId: r.pack_id ?? null,
      packNumber: r.pack_number ?? null,
      reporterId: r.reporter_id,
      reporterUsername: r.reporter_username,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at ?? null,
      reportType: r.report_type,
      commentId: r.comment_id,
      commentText: r.comment_text,
    }));
  },
  async adminResolveReport(token: string, id: string, action: 'resolve' | 'dismiss'): Promise<void> {
    await http(`/admin/reports/${id}/resolve`, { method: 'POST', token, body: { action } });
  },
  async adminDeletePack(token: string, id: string): Promise<void> {
    await http(`/admin/packs/${id}`, { method: 'DELETE', token });
  },
  async adminDeleteComment(token: string, id: string): Promise<void> {
    await http(`/admin/comments/${id}`, { method: 'DELETE', token });
  },
  async adminSetBan(token: string, id: string, value: boolean): Promise<User> {
    const res = await http<{ user: any }>(`/admin/users/${id}/ban`, {
      method: 'POST', body: { value }, token,
    });
    return mapUser(res.user);
  },
  async adminSetPro(token: string, id: string, value: boolean): Promise<User> {
    const res = await http<{ user: any }>(`/admin/users/${id}/pro`, {
      method: 'POST', body: { value }, token,
    });
    return mapUser(res.user);
  },
  async adminListNotifications(token: string): Promise<AdminNotification[]> {
    const res = await http<{ notifications: any[] }>('/admin/notifications', { token });
    return res.notifications.map((n) => ({
      id: n.id,
      userId: n.user_id ?? null,
      username: n.username ?? null,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      readAt: n.read_at ?? null,
      createdAt: n.created_at,
    }));
  },
  async adminSendNotification(
    token: string,
    payload: { title: string; body?: string; userId?: string },
  ): Promise<void> {
    await http('/admin/notifications', { method: 'POST', token, body: payload });
  },
  async adminResetStreak(token: string, id: string): Promise<void> {
    await http(`/admin/users/${id}/reset-streak`, { method: 'POST', token });
  },
  async adminUnlockCamera(token: string, id: string): Promise<void> {
    await http(`/admin/users/${id}/unlock-camera`, { method: 'POST', token });
  },
  async adminResetPackTimer(token: string, packId: string, hours = 18): Promise<string> {
    const res = await http<{ expiresAt: string }>(`/admin/packs/${packId}/reset-timer`, {
      method: 'POST', token, body: { hours },
    });
    return res.expiresAt;
  },
  async savePushToken(token: string, pushToken: string): Promise<void> {
    await http('/me/push-token', { method: 'POST', token, body: { token: pushToken } });
  },
  async getPublicProfile(username: string): Promise<{ username: string; avatarUrl?: string; city: string; country: string; flag: string; streakDays: number; isPro: boolean; isAdmin: boolean; joinedAt: string; packs: number; countries: number; countryList: { flag: string; name: string }[]; packedWith: { flag: string; name: string }[]; invitedBy: string | null; vibeProfile: Record<string, number>; hasPongBadge?: boolean }> {
    const res = await http<{ user: any }>(`/users/${encodeURIComponent(username)}`, {});
    return { ...res.user, avatarUrl: avatarUrlAbsolute(res.user.avatarUrl) ?? res.user.avatarUrl };
  },
  async getDailyTopic(): Promise<{ topic: string; date: string }> {
    const res = await http<{ topic: string; date: string }>('/daily-topic', {});
    return res;
  },
  async adminSetDailyTopic(token: string, topic: string): Promise<void> {
    await http('/admin/daily-topic', { method: 'POST', token, body: { topic } });
  },
  async getNotifications(token: string): Promise<NotificationItem[]> {
    const res = await http<{ notifications: any[] }>('/notifications', { token });
    return res.notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      packId: n.pack_id ?? null,
      readAt: n.read_at ?? null,
      createdAt: n.created_at,
    }));
  },
  async markNotificationsRead(token: string): Promise<void> {
    await http('/notifications/read-all', { method: 'POST', token });
  },
  async markNotificationRead(token: string, id: string): Promise<void> {
    await http(`/notifications/${id}/read`, { method: 'POST', token });
  },
};

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  packId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  userId: string | null;
  username: string | null;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  packId: string | null;
  packNumber: number | null;
  reporterId: string;
  reporterUsername: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
  reportType?: 'pack' | 'comment';
  commentId?: string;
  commentText?: string;
}

export { HTTPError, ResponseParseError };
