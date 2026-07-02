import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { pool, query } from './db';
import { generateInviteCode, isValidFormat, normalize } from './codes';
import { bootstrap, showGenesisCodes } from './migrate';
import { moderateText, moderateImage } from './moderation';

const MAX_PACK_MEMBERS = 4;

const app = express();
app.use(cors());
// Photos are uploaded as base64 JSON, so allow large bodies.
app.use(express.json({ limit: '50mb' }));

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Health check used by Render (and uptime monitors) to verify the service is alive.
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

interface UserRow {
  id: string;
  username: string;
  invite_code: string;
  invite_slots: number;
  invited_by: string | null;
  streak_days: number;
  last_post_at: string | null;
  city: string;
  country: string;
  flag: string;
  created_at: string;
  email: string | null;
  is_admin: boolean;
  is_pro: boolean;
  avatar_url: string | null;
  banned: boolean;
  push_token: string | null;
  lat: number | null;
  lng: number | null;
  avatar_data: string | null;
  avatar_mime: string | null;
  pro_border: string | null;
  has_pong_badge: boolean;
}

/* Free geocoding via Nominatim (OpenStreetMap). Rate-limited; ok for infrequent registrations. */
async function geocodeCity(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${city}, ${country}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'flashpack-app/1.0' },
    });
    const data = (await res.json()) as any[];
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn('geocoding failed for', city, country, e);
  }
  return null;
}

function avatarUrl(row: UserRow): string | undefined {
  if (row.avatar_data) return `/avatars/${row.id}`;
  if (row.avatar_url) return row.avatar_url;
  return undefined;
}

// Serialize a user row for client responses: include a computed `avatarUrl`
// that points at the hosted /avatars/:id endpoint when an avatar is stored as
// base64 in avatar_data (avatar_url is cleared on upload).
function serializeUser<T extends UserRow>(row: T): T & { avatarUrl: string | undefined } {
  return { ...row, avatarUrl: avatarUrl(row) };
}

async function findUserByCode(code: string): Promise<UserRow | null> {
  const rows = await query<UserRow>('SELECT * FROM users WHERE invite_code = $1', [code]);
  return rows[0] ?? null;
}

async function findGenesis(code: string): Promise<{ code: string; used: boolean } | null> {
  const rows = await query<{ code: string; used: boolean }>(
    'SELECT code, used FROM genesis_codes WHERE code = $1',
    [code],
  );
  return rows[0] ?? null;
}

async function slotsUsed(userId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM users WHERE invited_by = $1',
    [userId],
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

async function getInviteContext(rawCode: string) {
  const code = normalize(rawCode);
  if (!isValidFormat(code)) return { ok: false as const, reason: 'invalid_format' };

  const genesis = await findGenesis(code);
  if (genesis && !genesis.used) return { ok: true as const, kind: 'genesis' as const, code };
  if (genesis && genesis.used) return { ok: false as const, reason: 'already_used' };

  const owner = await findUserByCode(code);
  if (!owner) return { ok: false as const, reason: 'not_found' };

  const used = await slotsUsed(owner.id);
  const effectiveSlots = owner.invite_slots + (owner.is_pro ? 2 : 0);
  if (used >= effectiveSlots) return { ok: false as const, reason: 'no_slots' };

  return { ok: true as const, kind: 'user' as const, owner, code };
}

async function sendPushNotifications(userIds: string[], title: string, body: string, data?: Record<string, any>) {
  try {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
    const rows = await query<{ push_token: string }>(
      `SELECT push_token FROM users WHERE id IN (${placeholders}) AND push_token IS NOT NULL`,
      userIds,
    );
    const tokens = rows.map((r) => r.push_token).filter(Boolean) as string[];
    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }));

    const chunks = [];
    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    }
  } catch (e) {
    console.error('push send failed', e);
  }
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// Username-only login. OTP is intentionally skipped — anyone who knows a
// username can sign in. Acceptable for the prototype, but tighten before launch.
app.post('/auth/login', async (req: Request, res: Response) => {
  const { username } = req.body ?? {};
  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'missing_username' });
  }
  const clean = username.trim().toLowerCase();
  const rows = await query<UserRow & { invited_by_username: string | null }>(
    `SELECT u.*, inv.username AS invited_by_username
     FROM users u
     LEFT JOIN users inv ON inv.id = u.invited_by
     WHERE u.username = $1`,
    [clean],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: serializeUser(rows[0]), token: rows[0].id });
});

app.post('/invite/verify', async (req: Request, res: Response) => {
  const { code } = req.body ?? {};
  if (typeof code !== 'string') return res.status(400).json({ valid: false, reason: 'missing_code' });
  const ctx = await getInviteContext(code);
  if (!ctx.ok) return res.json({ valid: false, reason: ctx.reason });
  return res.json({ valid: true, kind: ctx.kind });
});

app.post('/invite/redeem', async (req: Request, res: Response) => {
  const { code, username, city, country, flag } = req.body ?? {};
  if (typeof code !== 'string' || typeof username !== 'string') {
    return res.status(400).json({ error: 'code and username are required' });
  }

  const cleanName = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (cleanName.length < 2 || cleanName.length > 20) {
    return res.status(400).json({ error: 'username must be 2–20 chars (a-z, 0-9, _.-)' });
  }

  const ctx = await getInviteContext(code);
  if (!ctx.ok) return res.status(400).json({ error: ctx.reason });

  const taken = await query<{ id: string }>('SELECT id FROM users WHERE username = $1', [cleanName]);
  if (taken.length) return res.status(409).json({ error: 'username_taken' });

  // Try IP-based geolocation if client didn't send location
  let userCity = city;
  let userCountry = country;
  let userFlag = flag;
  if (!userCity || !userCountry) {
    try {
      const ipRes = await fetch(`https://ipapi.co/${req.ip ?? ''}/json/`);
      const ipData = (await ipRes.json()) as any;
      userCity = userCity ?? ipData?.city ?? 'unknown';
      userCountry = userCountry ?? ipData?.country_code ?? 'UN';
      userFlag = userFlag ?? ipData?.country_flag ?? '🌍';
    } catch (e) {
      console.warn('IP geolocation failed:', e);
      userCity = userCity ?? 'unknown';
      userCountry = userCountry ?? 'UN';
      userFlag = userFlag ?? '🌍';
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let newCode = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await client.query(
        'SELECT 1 FROM users WHERE invite_code = $1 UNION SELECT 1 FROM genesis_codes WHERE code = $1',
        [newCode],
      );
      if (exists.rowCount === 0) break;
      newCode = generateInviteCode();
    }

    const invitedBy = ctx.kind === 'user' ? ctx.owner.id : null;
    const coords = await geocodeCity(userCity, userCountry);
    const insert = await client.query<UserRow>(
      `INSERT INTO users(username, invite_code, invited_by, city, country, flag, lat, lng)
       VALUES ($1, $2, $3, COALESCE($4, 'unknown'), COALESCE($5, 'UN'), COALESCE($6, '�'), $7, $8)
       RETURNING *`,
      [cleanName, newCode, invitedBy, userCity, userCountry, userFlag, coords?.lat ?? null, coords?.lng ?? null],
    );
    const user = insert.rows[0];

    if (ctx.kind === 'genesis') {
      await client.query(
        `UPDATE genesis_codes SET used = TRUE, used_by = $1, used_at = NOW() WHERE code = $2`,
        [user.id, ctx.code],
      );
    }

    await client.query('COMMIT');
    const invitedByUsername = ctx.kind === 'user' ? ctx.owner.username : null;
    return res.json({ user: { ...serializeUser(user), invited_by_username: invitedByUsername }, token: user.id });
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('redeem failed', e);
    return res.status(500).json({ error: 'server_error', detail: e?.message });
  } finally {
    client.release();
  }
});

function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'missing_token' });
  (req as any).userId = token;
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = (req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'missing_token' });
  const rows = await query<UserRow>('SELECT * FROM users WHERE id = $1', [token]);
  if (!rows[0]) return res.status(401).json({ error: 'invalid_token' });
  if (!rows[0].is_admin) return res.status(403).json({ error: 'forbidden' });
  (req as any).userId = token;
  (req as any).adminUser = rows[0];
  next();
}

app.get('/me', requireUser, async (req: Request, res: Response) => {
  const id = (req as any).userId as string;
  const rows = await query<UserRow & { invited_by_username: string | null }>(
    `SELECT u.*, inv.username AS invited_by_username
     FROM users u
     LEFT JOIN users inv ON inv.id = u.invited_by
     WHERE u.id = $1`,
    [id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: serializeUser(rows[0]) });
});

app.post('/me/push-token', requireUser, async (req: Request, res: Response) => {
  const id = (req as any).userId as string;
  const { token } = req.body ?? {};
  if (!token || typeof token !== 'string') return res.status(400).json({ error: 'token_required' });
  await query('UPDATE users SET push_token = $1 WHERE id = $2', [token, id]);
  return res.json({ ok: true });
});

app.get('/invite/slots', requireUser, async (req: Request, res: Response) => {
  const id = (req as any).userId as string;
  const me = (await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]))[0];
  if (!me) return res.status(404).json({ error: 'not_found' });

  const effectiveSlots = me.invite_slots + (me.is_pro ? 2 : 0);

  const invitees = await query<{ id: string; username: string; created_at: string }>(
    'SELECT id, username, created_at FROM users WHERE invited_by = $1 ORDER BY created_at',
    [id],
  );

  const slots = [];
  for (let i = 0; i < effectiveSlots; i++) {
    const inv = invitees[i];
    if (inv) {
      slots.push({
        id: inv.id,
        invitedUsername: inv.username,
        status: 'joined',
        sentAt: inv.created_at,
      });
    } else {
      slots.push({ id: `open-${i}`, status: 'open' });
    }
  }
  return res.json({ code: me.invite_code, slots, effectiveSlots });
});

// ---- photos ----

// Public: serve the raw image bytes for a photo so any pack member can load it.
// No auth header is required because image loaders (Skia/<Image>) can't send one;
// the photo id is an unguessable UUID.
app.get('/photos/:id/raw', async (req: Request, res: Response) => {
  const photoId = req.params.id;
  const cachedFilePath = path.join(UPLOADS_DIR, `raw-${photoId}`);
  const mimePath = cachedFilePath + '.mime';

  if (fs.existsSync(cachedFilePath) && fs.existsSync(mimePath)) {
    try {
      const mime = fs.readFileSync(mimePath, 'utf8');
      res.setHeader('Content-Type', mime || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.sendFile(cachedFilePath);
    } catch (err) {
      console.error('Error reading cached raw file:', err);
    }
  }

  const rows = await query<{ image_data: string | null; image_mime: string | null }>(
    'SELECT image_data, image_mime FROM photos WHERE id = $1 AND reverted_at IS NULL',
    [photoId],
  );
  const row = rows[0];
  if (!row || !row.image_data) return res.status(404).end();
  const buf = Buffer.from(row.image_data, 'base64');
  const mime = row.image_mime || 'image/jpeg';

  try {
    fs.writeFileSync(cachedFilePath, buf);
    fs.writeFileSync(mimePath, mime);
  } catch (err) {
    console.error('Error writing cached raw file:', err);
  }

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  return res.sendFile(cachedFilePath);
});

// Public: serve the flash.live video clip for a photo.
app.get('/photos/:id/video', async (req: Request, res: Response) => {
  const photoId = req.params.id;
  const cachedFilePath = path.join(UPLOADS_DIR, `video-${photoId}`);
  const mimePath = cachedFilePath + '.mime';

  if (fs.existsSync(cachedFilePath) && fs.existsSync(mimePath)) {
    try {
      const mime = fs.readFileSync(mimePath, 'utf8');
      res.setHeader('Content-Type', mime || 'video/mp4');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.sendFile(cachedFilePath);
    } catch (err) {
      console.error('Error reading cached video file:', err);
    }
  }

  const rows = await query<{ video_data: string | null; video_mime: string | null }>(
    'SELECT video_data, video_mime FROM photos WHERE id = $1 AND reverted_at IS NULL',
    [photoId],
  );
  const row = rows[0];
  if (!row || !row.video_data) return res.status(404).end();
  const buf = Buffer.from(row.video_data, 'base64');
  const mime = row.video_mime || 'video/mp4';

  try {
    fs.writeFileSync(cachedFilePath, buf);
    fs.writeFileSync(mimePath, mime);
  } catch (err) {
    console.error('Error writing cached video file:', err);
  }

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  return res.sendFile(cachedFilePath);
});

app.post('/photos', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { filter, imageUrl, imageData, imageMime, videoData, videoMime } = req.body ?? {};

  // Accept either a raw base64 string or a full data URI; store only the base64 payload.
  const base64 =
    typeof imageData === 'string' ? imageData.replace(/^data:[^;]+;base64,/, '') : null;

  // flash.live clip — optional video payload
  const videoBase64 =
    typeof videoData === 'string' ? videoData.replace(/^data:[^;]+;base64,/, '') : null;

  console.log(`[POST /photos] user=${userId} hasImage=${!!base64} hasVideo=${!!videoBase64} videoMime=${videoMime ?? 'none'} videoBytes=${videoBase64 ? Math.round(videoBase64.length * 0.75 / 1024) + 'kb' : 0}`);

  if (base64) {
    const verdict = await moderateImage(base64, imageMime ?? 'image/jpeg');
    if (!verdict.safe) {
      console.warn(`[POST /photos] rejected for user=${userId} categories=${verdict.categories.join(',')}`);
      return res.status(422).json({ error: 'image_rejected', categories: verdict.categories });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert photo (with optional video)
    const photoRes = await client.query(
      `INSERT INTO photos(user_id, filter, image_url, image_data, image_mime, video_data, video_mime, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '18 hours')
       RETURNING id`,
      [userId, filter ?? 'raw', base64 ? null : imageUrl ?? null, base64, imageMime ?? 'image/jpeg', videoBase64, videoMime ?? null],
    );
    const photoId = photoRes.rows[0].id;

    // Update user last_post_at and streak
    await client.query(
      `UPDATE users SET last_post_at = NOW(),
        streak_days = CASE WHEN last_post_at > NOW() - INTERVAL '48 hours' THEN streak_days + 1 ELSE 1 END
       WHERE id = $1`,
      [userId],
    );

    // Simple matching: find an open pack that isn't expired, isn't full, and doesn't already have this user.
    let packRes = await client.query(
      `SELECT p.id, p.number FROM packs p
       WHERE p.status = 'open'
         AND p.expires_at > NOW()
         AND (
           SELECT COUNT(*) FROM pack_members pm WHERE pm.pack_id = p.id
         ) < $2
         AND NOT EXISTS (
           SELECT 1 FROM pack_members pm WHERE pm.pack_id = p.id AND pm.user_id = $1
         )
       LIMIT 1`,
      [userId, MAX_PACK_MEMBERS],
    );

    let packId: string;
    let packNumber: number;

    if (packRes.rows.length === 0) {
      // Create new pack
      const countRes = await client.query<{ max: string }>(`SELECT COALESCE(MAX(number), 0)::text AS max FROM packs`);
      packNumber = parseInt(countRes.rows[0].max, 10) + 1;
      const newPack = await client.query(
        `INSERT INTO packs(number, status, expires_at) VALUES ($1, 'open', NOW() + INTERVAL '18 hours') RETURNING id`,
        [packNumber],
      );
      packId = newPack.rows[0].id;
    } else {
      packId = packRes.rows[0].id;
      packNumber = packRes.rows[0].number;
    }

    // Add user to pack
    const userRes = await client.query<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
    const u = userRes.rows[0];
    await client.query(
      `INSERT INTO pack_members(pack_id, user_id, photo_id, city, country, flag, has_posted)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       ON CONFLICT (pack_id, user_id) DO UPDATE SET photo_id = $3, has_posted = TRUE`,
      [packId, userId, photoId, u.city, u.country, u.flag],
    );

    // Compute & persist chemistry score for this pack
    const chemRows = await client.query<{
      member_count: string;
      country_count: string;
      filter_count: string;
      span_seconds: string;
    }>(
      `SELECT
         COUNT(DISTINCT pm.user_id)::text AS member_count,
         COUNT(DISTINCT pm.country)::text AS country_count,
         COUNT(DISTINCT ph.filter)::text AS filter_count,
         COALESCE(EXTRACT(EPOCH FROM (MAX(ph.created_at) - MIN(ph.created_at))), 0)::text AS span_seconds
       FROM pack_members pm
       LEFT JOIN photos ph ON ph.id = pm.photo_id
       WHERE pm.pack_id = $1`,
      [packId],
    );
    const cr = chemRows.rows[0];
    const members = parseInt(cr.member_count, 10);
    const countries = parseInt(cr.country_count, 10);
    const filters = parseInt(cr.filter_count, 10);
    const spanSec = parseFloat(cr.span_seconds);
    // Base 50 + people (max 12) + country diversity (max 16) + filter diversity (max 12)
    // + proximity (max 10): closer in time = higher
    const peopleScore = Math.min(12, members * 3);
    const countryScore = Math.min(16, countries * 6);
    const filterScore = Math.min(12, filters * 4);
    const proximityScore = spanSec === 0 ? 0 : Math.max(0, 10 - Math.floor(spanSec / 900)); // -1 per 15 min
    // Daily topic bonus: +5 if today's topic exists
    const today = new Date().toISOString().slice(0, 10);
    const topicRow = await client.query<{ topic: string }>(
      `SELECT topic FROM daily_topics WHERE topic_date = $1`,
      [today],
    );
    const topicBonus = topicRow.rows.length > 0 ? 5 : 0;
    const chemistry = Math.min(99, Math.max(40, 50 + peopleScore + countryScore + filterScore + proximityScore + topicBonus));
    await client.query(`UPDATE packs SET chemistry_score = $1 WHERE id = $2`, [chemistry, packId]);

    // Notify other pack members
    const others = await client.query<{ user_id: string }>(
      `SELECT user_id FROM pack_members WHERE pack_id = $1 AND user_id <> $2`,
      [packId, userId],
    );
    if (others.rows.length > 0) {
      const values: string[] = [];
      const params: any[] = [];
      others.rows.forEach((o, i) => {
        const off = i * 4;
        values.push(`($${off + 1}, 'pack', $${off + 2}, $${off + 3}, $${off + 4})`);
        params.push(o.user_id, `@${u.username} just dropped`, `pack #${packNumber} now has a new flash`, packId);
      });
      await client.query(
        `INSERT INTO notifications(user_id, type, title, body, pack_id) VALUES ${values.join(', ')}`,
        params,
      );
      sendPushNotifications(
        others.rows.map((o) => o.user_id),
        `@${u.username} just dropped`,
        `pack #${packNumber} now has a new flash`,
        { packId },
      );
    }

    await client.query('COMMIT');
    return res.json({ photoId, packId, packNumber });
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('photo upload failed', e);
    return res.status(500).json({ error: 'server_error', detail: e?.message });
  } finally {
    client.release();
  }
});

app.post('/photos/:id/revert', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const photoId = req.params.id;

  const rows = await query<{ id: string; user_id: string; created_at: string }>(
    'SELECT id, user_id, created_at FROM photos WHERE id = $1',
    [photoId],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  if (rows[0].user_id !== userId) return res.status(403).json({ error: 'forbidden' });

  const userRows = await query<{ is_pro: boolean }>(
    'SELECT is_pro FROM users WHERE id = $1',
    [userId],
  );
  const isPro = userRows[0]?.is_pro ?? false;
  const windowMs = isPro ? 24 * 3600 * 1000 : 2 * 3600 * 1000;

  const created = new Date(rows[0].created_at).getTime();
  if (Date.now() - created > windowMs) {
    return res.status(400).json({ error: 'revert_window_closed' });
  }

  await query('UPDATE photos SET reverted_at = NOW() WHERE id = $1', [photoId]);
  // Remove from pack
  await query('DELETE FROM pack_members WHERE photo_id = $1', [photoId]);
  // Reset last_post_at so camera unlocks
  await query('UPDATE users SET last_post_at = NULL WHERE id = $1', [userId]);

  // Delete cached media files from disk
  const cachedFilePath = path.join(UPLOADS_DIR, `raw-${photoId}`);
  const cachedVideoPath = path.join(UPLOADS_DIR, `video-${photoId}`);
  try {
    if (fs.existsSync(cachedFilePath)) fs.unlinkSync(cachedFilePath);
    if (fs.existsSync(cachedFilePath + '.mime')) fs.unlinkSync(cachedFilePath + '.mime');
    if (fs.existsSync(cachedVideoPath)) fs.unlinkSync(cachedVideoPath);
    if (fs.existsSync(cachedVideoPath + '.mime')) fs.unlinkSync(cachedVideoPath + '.mime');
  } catch (err) {
    console.error('Error unlinking reverted photo caches:', err);
  }

  return res.json({ ok: true });
});

// React to an individual photo (one emoji per user per photo; re-reacting updates it).
app.post('/photos/:id/react', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const photoId = req.params.id;
  const { emoji } = req.body ?? {};
  if (!emoji || typeof emoji !== 'string') return res.status(400).json({ error: 'emoji_required' });

  const exists = await query('SELECT 1 FROM photos WHERE id = $1 AND reverted_at IS NULL', [photoId]);
  if (!exists.length) return res.status(404).json({ error: 'not_found' });

  await query(
    `INSERT INTO photo_reactions(photo_id, user_id, emoji) VALUES ($1, $2, $3)
     ON CONFLICT (photo_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji, created_at = NOW()`,
    [photoId, userId, emoji],
  );
  return res.json({ ok: true });
});

// ---- packs ----

interface PackBaseRow {
  pack_id: string;
  pack_number: number;
  pack_status: string;
  pack_created_at: string;
  pack_expires_at: string;
  pack_chemistry_score: number;
}

// Build the full client-facing pack payload (members, photos + per-photo
// reactions, pack reactions, comments) for a single pack base row.
async function shapePack(r: PackBaseRow) {
  const members = await query<{
    user_id: string;
    username: string;
    city: string;
    country: string;
    flag: string;
    has_posted: boolean;
    initials: string;
    avatar_url: string | null;
    avatar_data: string | null;
    is_pro: boolean;
    pro_border: string | null;
    lat: number | null;
    lng: number | null;
  }>(
    `SELECT pm.user_id, u.username, pm.city, pm.country, pm.flag, pm.has_posted,
            UPPER(LEFT(u.username, 2)) AS initials,
            u.avatar_url, u.avatar_data, u.is_pro, u.pro_border, u.lat, u.lng
     FROM pack_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.pack_id = $1`,
    [r.pack_id],
  );

  const photos = await query<{
    id: string;
    user_id: string;
    image_url: string | null;
    has_image: boolean;
    has_video: boolean;
    filter: string;
    created_at: string;
    placeholder: [string, string];
  }>(
    `SELECT p.id, p.user_id, p.image_url, (p.image_data IS NOT NULL) AS has_image,
            (p.video_data IS NOT NULL) AS has_video,
            p.filter, p.created_at,
            ARRAY['#3b2a4a', '#1a1a2e']::text[] AS placeholder
     FROM photos p
     JOIN pack_members pm ON pm.photo_id = p.id
     WHERE pm.pack_id = $1 AND p.reverted_at IS NULL`,
    [r.pack_id],
  );

  const photoReactions = photos.length
    ? await query<{ photo_id: string; user_id: string; emoji: string }>(
        `SELECT photo_id, user_id, emoji FROM photo_reactions WHERE photo_id = ANY($1::uuid[])`,
        [photos.map((p) => p.id)],
      )
    : [];

  const reactions = await query<{ emoji: string; user_id: string }>(
    'SELECT emoji, user_id FROM pack_reactions WHERE pack_id = $1',
    [r.pack_id],
  );

  const comments = await query<{
    id: string;
    user_id: string;
    username: string;
    flag: string;
    city: string;
    text: string;
    created_at: string;
    avatar_url: string | null;
    avatar_data: string | null;
  }>(
    `SELECT pc.id, pc.user_id, u.username, pm.flag, pm.city, pc.text, pc.created_at, u.avatar_url, u.avatar_data
     FROM pack_comments pc
     JOIN users u ON u.id = pc.user_id
     JOIN pack_members pm ON pm.user_id = pc.user_id AND pm.pack_id = pc.pack_id
     WHERE pc.pack_id = $1 ORDER BY pc.created_at`,
    [r.pack_id],
  );

  const screenshots = await query<{ user_id: string; username: string; created_at: string }>(
    'SELECT user_id, username, created_at FROM pack_screenshots WHERE pack_id = $1 ORDER BY created_at DESC',
    [r.pack_id],
  );

  const allPosted = members.every((m) => m.has_posted);
  return {
    id: r.pack_id,
    number: r.pack_number,
    status: r.pack_status,
    createdAt: r.pack_created_at,
    expiresAt: r.pack_expires_at,
    chemistryScore: r.pack_chemistry_score,
    members: members.map((m) => ({
      id: m.user_id,
      userId: m.user_id,
      username: m.username,
      flag: m.flag,
      city: m.city,
      country: m.country,
      lat: m.lat ?? undefined,
      lng: m.lng ?? undefined,
      hasPosted: m.has_posted,
      avatarColor: '#FFD60A',
      avatarUrl: m.avatar_data ? `/avatars/${m.user_id}` : (m.avatar_url ?? undefined),
      isPro: m.is_pro,
      proBorder: m.pro_border ?? undefined,
      initials: m.initials,
    })),
    photos: photos.map((p) => ({
      id: p.id,
      userId: p.user_id,
      // Prefer the hosted image endpoint; fall back to any legacy stored URL.
      imageURL: p.has_image ? `/photos/${p.id}/raw` : p.image_url ?? undefined,
      // flash.live silent clip (Pro)
      videoURL: p.has_video ? `/photos/${p.id}/video` : undefined,
      filter: p.filter,
      capturedAt: p.created_at,
      expiresAt: r.pack_expires_at,
      placeholder: p.placeholder as [string, string],
      reactions: photoReactions
        .filter((pr) => pr.photo_id === p.id)
        .map((pr) => ({ userId: pr.user_id, emoji: pr.emoji })),
    })),
    reactions: reactions.map((rr) => ({ emoji: rr.emoji, userId: rr.user_id })),
    comments: comments.map((c) => ({
      id: c.id,
      userId: c.user_id,
      username: c.username,
      flag: c.flag,
      city: c.city,
      text: c.text,
      sentAt: c.created_at,
      avatarUrl: c.avatar_data ? `/avatars/${c.user_id}` : (c.avatar_url ?? undefined),
    })),
    allPosted,
    screenshots: screenshots.map((s) => ({ userId: s.user_id, username: s.username, takenAt: s.created_at })),
    countriesCount: new Set(members.map((m) => m.country)).size,
    apartMinutes: photos.length > 1
      ? Math.round(
          (new Date(photos[photos.length - 1].created_at).getTime() -
            new Date(photos[0].created_at).getTime()) /
            60000,
        )
      : 0,
  };
}

app.get('/packs', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const rows = await query<PackBaseRow>(
    `SELECT p.id AS pack_id, p.number AS pack_number, p.status AS pack_status,
            p.created_at AS pack_created_at, p.expires_at AS pack_expires_at,
            p.chemistry_score AS pack_chemistry_score
     FROM packs p
     JOIN pack_members pm ON pm.pack_id = p.id
     WHERE pm.user_id = $1 AND p.status != 'closed'
     ORDER BY p.created_at DESC`,
    [userId],
  );

  const packs = [];
  for (const r of rows) packs.push(await shapePack(r));
  return res.json({ packs });
});

// Random recent active packs from around the world that the user is NOT part of.
// Only packs that have at least one hosted photo are eligible.
app.get('/packs/discover', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const rows = await query<PackBaseRow>(
    `SELECT p.id AS pack_id, p.number AS pack_number, p.status AS pack_status,
            p.created_at AS pack_created_at, p.expires_at AS pack_expires_at,
            p.chemistry_score AS pack_chemistry_score
     FROM packs p
     WHERE p.status != 'closed'
       AND p.expires_at > NOW()
       AND NOT EXISTS (
         SELECT 1 FROM pack_members pm WHERE pm.pack_id = p.id AND pm.user_id = $1
       )
       AND EXISTS (
         SELECT 1 FROM pack_members pm
         JOIN photos ph ON ph.id = pm.photo_id
         WHERE pm.pack_id = p.id AND ph.image_data IS NOT NULL AND ph.reverted_at IS NULL
       )
     ORDER BY RANDOM()
     LIMIT 15`,
    [userId],
  );

  const packs = [];
  for (const r of rows) packs.push(await shapePack(r));
  return res.json({ packs });
});

app.get('/packs/:id', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const packId = req.params.id;

  const memberCheck = await query(
    'SELECT 1 FROM pack_members WHERE pack_id = $1 AND user_id = $2',
    [packId, userId],
  );
  if (!memberCheck.length) return res.status(403).json({ error: 'forbidden' });

  const pack = await query<{
    id: string;
    number: number;
    status: string;
    created_at: string;
    expires_at: string;
    chemistry_score: number;
  }>(
    'SELECT id, number, status, created_at, expires_at, chemistry_score FROM packs WHERE id = $1',
    [packId],
  );
  if (!pack[0]) return res.status(404).json({ error: 'not_found' });

  return res.json({ pack: pack[0] });
});

// ---- reactions & comments ----

app.post('/packs/:id/react', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const packId = req.params.id;
  const { emoji } = req.body ?? {};
  if (!emoji || typeof emoji !== 'string') return res.status(400).json({ error: 'emoji_required' });

  const count = await query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM pack_reactions WHERE pack_id = $1',
    [packId],
  );
  if (parseInt(count[0].count, 10) >= 5) {
    return res.status(400).json({ error: 'max_reactions' });
  }

  await query(
    `INSERT INTO pack_reactions(pack_id, user_id, emoji) VALUES ($1, $2, $3)
     ON CONFLICT (pack_id, user_id) DO UPDATE SET emoji = $3`,
    [packId, userId, emoji],
  );
  // Notify other members
  const recips = await query<{ user_id: string }>(
    `SELECT pm.user_id FROM pack_members pm WHERE pm.pack_id = $1 AND pm.user_id <> $2`,
    [packId, userId],
  );
  if (recips.length > 0) {
    await query(
      `INSERT INTO notifications(user_id, type, title, body, pack_id)
       SELECT pm.user_id, 'reaction', $1, $2, $3
       FROM pack_members pm
       WHERE pm.pack_id = $3 AND pm.user_id <> $4`,
      [`${emoji} on your pack`, `someone reacted with ${emoji}`, packId, userId],
    );
    sendPushNotifications(
      recips.map((r) => r.user_id),
      `${emoji} on your pack`,
      `someone reacted with ${emoji}`,
      { packId },
    );
  }
  return res.json({ ok: true });
});

app.post('/packs/:id/comment', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const packId = req.params.id;
  const { text } = req.body ?? {};
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text_required' });

  const verdict = await moderateText(text);
  if (!verdict.safe) {
    return res.status(422).json({ error: 'text_rejected', categories: verdict.categories });
  }

  await query(
    `INSERT INTO pack_comments(pack_id, user_id, text) VALUES ($1, $2, $3)
     ON CONFLICT (pack_id, user_id) DO UPDATE SET text = $3`,
    [packId, userId, text],
  );
  const u = await query<{ username: string }>('SELECT username FROM users WHERE id = $1', [userId]);
  const author = u[0]?.username ?? 'someone';
  const recips2 = await query<{ user_id: string }>(
    `SELECT pm.user_id FROM pack_members pm WHERE pm.pack_id = $1 AND pm.user_id <> $2`,
    [packId, userId],
  );
  if (recips2.length > 0) {
    await query(
      `INSERT INTO notifications(user_id, type, title, body, pack_id)
       SELECT pm.user_id, 'comment', $1, $2, $3
       FROM pack_members pm
       WHERE pm.pack_id = $3 AND pm.user_id <> $4`,
      [`@${author} commented`, text.slice(0, 80), packId, userId],
    );
    sendPushNotifications(
      recips2.map((r) => r.user_id),
      `@${author} commented`,
      text.slice(0, 80),
      { packId },
    );
  }
  return res.json({ ok: true });
});

// ---- streak ----

app.get('/streak', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const user = await query<UserRow>('SELECT streak_days, last_post_at FROM users WHERE id = $1', [userId]);
  if (!user[0]) return res.status(404).json({ error: 'not_found' });

  const history = await query<{
    id: string;
    filter: string;
    created_at: string;
  }>(
    `SELECT id, filter, created_at FROM photos
     WHERE user_id = $1 AND reverted_at IS NULL
     ORDER BY created_at DESC LIMIT 30`,
    [userId],
  );

  return res.json({
    streakDays: user[0].streak_days,
    lastPostAt: user[0].last_post_at,
    history: history.map((h) => ({
      id: h.id,
      filter: h.filter,
      date: h.created_at,
      // placeholder chemistry for now
      chemistry: Math.floor(60 + Math.random() * 35),
    })),
  });
});

// ---- streak insurance ----

app.post('/streak/insurance', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const userRows = await query<UserRow>('SELECT is_pro, streak_days, last_post_at FROM users WHERE id = $1', [userId]);
  if (!userRows[0]) return res.status(404).json({ error: 'not_found' });
  if (!userRows[0].is_pro) return res.status(403).json({ error: 'pro_required' });

  const lastPost = userRows[0].last_post_at ? new Date(userRows[0].last_post_at).getTime() : 0;
  const withinWindow = lastPost > 0 && Date.now() - lastPost < 48 * 3600 * 1000;
  if (withinWindow) return res.json({ ok: true, message: 'streak is safe' });

  // Save streak: reset last_post_at to 24h ago so the streak window is still open
  const fakeLastPost = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  await query('UPDATE users SET last_post_at = $1 WHERE id = $2', [fakeLastPost, userId]);
  return res.json({ ok: true, message: 'streak saved' });
});

// ---- notifications ----

app.get('/notifications', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const rows = await query<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    pack_id: string | null;
    read_at: string | null;
    created_at: string;
  }>(
    `SELECT id, type, title, body, pack_id, read_at, created_at
       FROM notifications
       WHERE user_id = $1 OR user_id IS NULL
       ORDER BY created_at DESC LIMIT 100`,
    [userId],
  );
  return res.json({ notifications: rows });
});

app.post('/notifications/read-all', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  await query(
    `UPDATE notifications SET read_at = NOW() WHERE (user_id = $1 OR user_id IS NULL) AND read_at IS NULL`,
    [userId],
  );
  return res.json({ ok: true });
});

app.post('/notifications/:id/read', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { id } = req.params;
  await query(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) AND read_at IS NULL`,
    [id, userId],
  );
  return res.json({ ok: true });
});

// ---- reports ----

app.post('/reports', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { packId, reason } = req.body ?? {};
  if (!packId || typeof packId !== 'string') return res.status(400).json({ error: 'pack_id_required' });
  if (!reason || typeof reason !== 'string') return res.status(400).json({ error: 'reason_required' });
  await query(
    `INSERT INTO pack_reports(pack_id, reporter_id, reason) VALUES ($1, $2, $3)`,
    [packId, userId, reason],
  );
  return res.json({ ok: true });
});

app.post('/user-reports', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { targetUserId, reason } = req.body ?? {};
  if (!targetUserId || typeof targetUserId !== 'string') return res.status(400).json({ error: 'target_user_id_required' });
  if (!reason || typeof reason !== 'string') return res.status(400).json({ error: 'reason_required' });
  await query(
    `INSERT INTO user_reports(target_user_id, reporter_id, reason) VALUES ($1, $2, $3)`,
    [targetUserId, userId, reason],
  );
  return res.json({ ok: true });
});

app.post('/comment-reports', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { commentId, reason } = req.body ?? {};
  if (!commentId || typeof commentId !== 'string') return res.status(400).json({ error: 'comment_id_required' });
  if (!reason || typeof reason !== 'string') return res.status(400).json({ error: 'reason_required' });
  await query(
    `INSERT INTO comment_reports(comment_id, reporter_id, reason) VALUES ($1, $2, $3)`,
    [commentId, userId, reason],
  );
  return res.json({ ok: true });
});

// ---- profile ----

app.patch('/me', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { avatarUrl, isPro, proBorder, hasPongBadge } = req.body ?? {};
  const sets: string[] = [];
  const values: any[] = [];
  if (typeof avatarUrl === 'string' || avatarUrl === null) {
    values.push(avatarUrl);
    sets.push(`avatar_url = $${values.length}`);
  }
  if (typeof isPro === 'boolean') {
    values.push(isPro);
    sets.push(`is_pro = $${values.length}`);
  }
  if (typeof proBorder === 'string' || proBorder === null) {
    values.push(proBorder);
    sets.push(`pro_border = $${values.length}`);
  }
  if (typeof hasPongBadge === 'boolean') {
    values.push(hasPongBadge);
    sets.push(`has_pong_badge = $${values.length}`);
  }
  if (sets.length === 0) return res.status(400).json({ error: 'no_fields' });
  values.push(userId);
  const rows = await query<UserRow>(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: serializeUser(rows[0]) });
});

// Serve avatar by user id (no auth needed; id is unguessable uuid)
app.get('/avatars/:userId', async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const cachedFilePath = path.join(UPLOADS_DIR, `avatar-${userId}`);
  const mimePath = cachedFilePath + '.mime';

  if (fs.existsSync(cachedFilePath) && fs.existsSync(mimePath)) {
    try {
      const mime = fs.readFileSync(mimePath, 'utf8');
      res.setHeader('Content-Type', mime || 'image/jpeg');
      // Avatars live at a stable per-user URL but can change, so don't cache as
      // immutable — revalidate so a new avatar replaces the old one immediately.
      res.setHeader('Cache-Control', 'no-cache');
      return res.sendFile(cachedFilePath);
    } catch (err) {
      console.error('Error reading cached avatar file:', err);
    }
  }

  const rows = await query<{ avatar_data: string | null; avatar_mime: string | null }>(
    'SELECT avatar_data, avatar_mime FROM users WHERE id = $1',
    [userId],
  );
  const row = rows[0];
  if (!row || !row.avatar_data) return res.status(404).end();
  const buf = Buffer.from(row.avatar_data, 'base64');
  const mime = row.avatar_mime || 'image/jpeg';

  try {
    fs.writeFileSync(cachedFilePath, buf);
    fs.writeFileSync(mimePath, mime);
  } catch (err) {
    console.error('Error writing cached avatar file:', err);
  }

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'no-cache');
  return res.sendFile(cachedFilePath);
});

// Upload avatar as base64
app.post('/me/avatar', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { imageData, imageMime } = req.body ?? {};
  if (!imageData || typeof imageData !== 'string') {
    return res.status(400).json({ error: 'imageData_required' });
  }

  // Delete cached avatar from disk if exists
  const cachedFilePath = path.join(UPLOADS_DIR, `avatar-${userId}`);
  try {
    if (fs.existsSync(cachedFilePath)) fs.unlinkSync(cachedFilePath);
    if (fs.existsSync(cachedFilePath + '.mime')) fs.unlinkSync(cachedFilePath + '.mime');
  } catch (err) {
    console.error('Error unlinking avatar cache:', err);
  }

  const rows = await query<UserRow>(
    'UPDATE users SET avatar_data = $1, avatar_mime = $2, avatar_url = NULL WHERE id = $3 RETURNING *',
    [imageData, imageMime ?? 'image/jpeg', userId],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ ok: true, avatarUrl: `/avatars/${userId}` });
});

// ---- admin ----

app.get('/admin/stats', requireAdmin, async (_req: Request, res: Response) => {
  const [{ users }] = await query<{ users: string }>(`SELECT COUNT(*)::text AS users FROM users`);
  const [{ admins }] = await query<{ admins: string }>(`SELECT COUNT(*)::text AS admins FROM users WHERE is_admin`);
  const [{ open_genesis }] = await query<{ open_genesis: string }>(
    `SELECT COUNT(*)::text AS open_genesis FROM genesis_codes WHERE used = FALSE`,
  );
  const [{ used_genesis }] = await query<{ used_genesis: string }>(
    `SELECT COUNT(*)::text AS used_genesis FROM genesis_codes WHERE used = TRUE`,
  );
  return res.json({
    users: parseInt(users, 10),
    admins: parseInt(admins, 10),
    openGenesis: parseInt(open_genesis, 10),
    usedGenesis: parseInt(used_genesis, 10),
  });
});

app.get('/admin/users', requireAdmin, async (_req: Request, res: Response) => {
  const rows = await query<UserRow & { invitee_count: string }>(
    `SELECT u.*, COALESCE((SELECT COUNT(*) FROM users WHERE invited_by = u.id), 0)::text AS invitee_count
       FROM users u ORDER BY u.created_at DESC LIMIT 200`,
  );
  return res.json({ users: rows });
});

app.delete('/admin/users/:id', requireAdmin, async (req: Request, res: Response) => {
  const me = (req as any).adminUser as UserRow;
  if (req.params.id === me.id) return res.status(400).json({ error: 'cannot_delete_self' });
  await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  return res.json({ ok: true });
});

app.post('/admin/users/:id/admin', requireAdmin, async (req: Request, res: Response) => {
  const { value } = req.body ?? {};
  if (typeof value !== 'boolean') return res.status(400).json({ error: 'value_required' });
  const rows = await query<UserRow>(
    `UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING *`,
    [value, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: rows[0] });
});

app.get('/admin/genesis', requireAdmin, async (_req: Request, res: Response) => {
  const codes = await query<{ code: string; used: boolean; used_by: string | null; used_at: string | null }>(
    `SELECT code, used, used_by, used_at FROM genesis_codes ORDER BY used, code`,
  );
  return res.json({ codes });
});

app.post('/admin/genesis', requireAdmin, async (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(String(req.body?.count ?? 1), 10) || 1, 1), 25);
  const created: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = generateInviteCode();
    for (let attempts = 0; attempts < 5; attempts++) {
      const exists = await query(
        `SELECT 1 FROM genesis_codes WHERE code = $1 UNION SELECT 1 FROM users WHERE invite_code = $1`,
        [code],
      );
      if (!exists.length) break;
      code = generateInviteCode();
    }
    await query(`INSERT INTO genesis_codes(code) VALUES ($1)`, [code]);
    created.push(code);
  }
  return res.json({ created });
});

// admin: reports
app.get('/admin/reports', requireAdmin, async (_req: Request, res: Response) => {
  const packRows = await query<{
    id: string;
    pack_id: string;
    reporter_id: string;
    reporter_username: string;
    reason: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
    pack_number: number | null;
    report_type: string;
  }>(
    `SELECT r.id, r.pack_id, r.reporter_id, u.username AS reporter_username,
            r.reason, r.status, r.created_at, r.resolved_at, p.number AS pack_number,
            'pack' as report_type
       FROM pack_reports r
       JOIN users u ON u.id = r.reporter_id
       LEFT JOIN packs p ON p.id = r.pack_id
       ORDER BY (r.status = 'pending') DESC, r.created_at DESC
       LIMIT 200`,
  );

  const commentRows = await query<{
    id: string;
    comment_id: string;
    reporter_id: string;
    reporter_username: string;
    reason: string;
    status: string;
    created_at: string;
    resolved_at: string | null;
    pack_id: string | null;
    pack_number: number | null;
    report_type: string;
  }>(
    `SELECT r.id, r.comment_id, r.reporter_id, u.username AS reporter_username,
            r.reason, r.status, r.created_at, r.resolved_at, p.id AS pack_id, p.number AS pack_number,
            'comment' as report_type
       FROM comment_reports r
       JOIN users u ON u.id = r.reporter_id
       JOIN comments c ON c.id = r.comment_id
       LEFT JOIN packs p ON p.id = c.pack_id
       ORDER BY (r.status = 'pending') DESC, r.created_at DESC
       LIMIT 200`,
  );

  const allReports = [...packRows, ...commentRows].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return res.json({ reports: allReports });
});

app.post('/admin/reports/:id/resolve', requireAdmin, async (req: Request, res: Response) => {
  const me = (req as any).adminUser as UserRow;
  const { action } = req.body ?? {}; // 'dismiss' | 'resolve'
  const status = action === 'dismiss' ? 'dismissed' : 'resolved';
  
  // Try pack_reports first
  const packResult = await query(
    `UPDATE pack_reports SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3 RETURNING id`,
    [status, me.id, req.params.id],
  );
  
  // If no rows affected, try comment_reports
  if (!packResult || packResult.length === 0) {
    await query(
      `UPDATE comment_reports SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3`,
      [status, me.id, req.params.id],
    );
  }
  
  return res.json({ ok: true });
});

app.delete('/admin/packs/:id', requireAdmin, async (req: Request, res: Response) => {
  await query('DELETE FROM packs WHERE id = $1', [req.params.id]);
  return res.json({ ok: true });
});

app.post('/admin/users/:id/ban', requireAdmin, async (req: Request, res: Response) => {
  const me = (req as any).adminUser as UserRow;
  if (req.params.id === me.id) return res.status(400).json({ error: 'cannot_ban_self' });
  const { value } = req.body ?? {};
  if (typeof value !== 'boolean') return res.status(400).json({ error: 'value_required' });
  const rows = await query<UserRow>(
    `UPDATE users SET banned = $1 WHERE id = $2 RETURNING *`,
    [value, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: rows[0] });
});

app.get('/admin/notifications', requireAdmin, async (_req: Request, res: Response) => {
  const rows = await query<{
    id: string;
    user_id: string | null;
    username: string | null;
    type: string;
    title: string;
    body: string | null;
    read_at: string | null;
    created_at: string;
  }>(
    `SELECT n.id, n.user_id, u.username, n.type, n.title, n.body, n.read_at, n.created_at
       FROM notifications n
       LEFT JOIN users u ON u.id = n.user_id
       ORDER BY n.created_at DESC LIMIT 200`,
  );
  return res.json({ notifications: rows });
});

app.post('/admin/notifications', requireAdmin, async (req: Request, res: Response) => {
  const { title, body, userId } = req.body ?? {};
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title_required' });
  await query(
    `INSERT INTO notifications(user_id, type, title, body) VALUES ($1, 'system', $2, $3)`,
    [userId ?? null, title, body ?? null],
  );
  return res.json({ ok: true });
});

app.post('/admin/users/:id/reset-streak', requireAdmin, async (req: Request, res: Response) => {
  await query(`UPDATE users SET streak_days = 0, last_post_at = NULL WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
});

app.post('/admin/users/:id/unlock-camera', requireAdmin, async (req: Request, res: Response) => {
  await query(`UPDATE users SET last_post_at = NULL WHERE id = $1`, [req.params.id]);
  return res.json({ ok: true });
});

app.post('/admin/packs/:id/reset-timer', requireAdmin, async (req: Request, res: Response) => {
  const hours = Number(req.body?.hours ?? 18);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
    return res.status(400).json({ error: 'invalid_hours' });
  }
  const rows = await query<{ id: string; expires_at: string }>(
    `UPDATE packs
       SET expires_at = NOW() + ($1 || ' hours')::interval,
           status = CASE WHEN status = 'expired' THEN 'open' ELSE status END
     WHERE id = $2
     RETURNING id, expires_at`,
    [String(hours), req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ ok: true, expiresAt: rows[0].expires_at });
});

app.post('/admin/users/:id/pro', requireAdmin, async (req: Request, res: Response) => {
  const { value } = req.body ?? {};
  if (typeof value !== 'boolean') return res.status(400).json({ error: 'value_required' });
  const rows = await query<UserRow>(
    `UPDATE users SET is_pro = $1 WHERE id = $2 RETURNING *`,
    [value, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'not_found' });
  return res.json({ user: rows[0] });
});

app.post('/screenshot', requireUser, async (req: Request, res: Response) => {
  const userId = (req as any).userId as string;
  const { packId } = req.body ?? {};
  if (!packId) return res.status(400).json({ error: 'packId_required' });

  const meRows = await query<{ username: string }>(
    `SELECT username FROM users WHERE id = $1`,
    [userId],
  );
  const username = meRows[0]?.username ?? 'someone';

  const memberRows = await query<{ user_id: string }>(
    `SELECT user_id FROM pack_members WHERE pack_id = $1 AND user_id = $2`,
    [packId, userId],
  );
  if (!memberRows.length) return res.status(403).json({ error: 'not_in_pack' });

  await query(
    `INSERT INTO pack_screenshots (pack_id, user_id, username) VALUES ($1, $2, $3)
     ON CONFLICT (pack_id, user_id) DO UPDATE SET created_at = NOW()`,
    [packId, userId, username],
  );

  const recips3 = await query<{ user_id: string }>(
    `SELECT user_id FROM pack_members WHERE pack_id = $1 AND user_id != $2`,
    [packId, userId],
  );
  if (recips3.length > 0) {
    await query(
      `INSERT INTO notifications (user_id, type, title, body, pack_id)
       SELECT user_id, 'screenshot', 'screenshot alert', $1 || ' took a screenshot in your pack', $2
       FROM pack_members WHERE pack_id = $2 AND user_id != $3`,
      [username, packId, userId],
    );
    sendPushNotifications(
      recips3.map((r) => r.user_id),
      'screenshot alert',
      `${username} took a screenshot in your pack`,
      { packId },
    );
  }

  return res.json({ ok: true });
});

app.get('/users/:username', async (req: Request, res: Response) => {
  const username = req.params.username.trim().toLowerCase();
  const userRows = await query<UserRow>(
    `SELECT id, username, avatar_url, avatar_data, avatar_mime, city, country, flag, streak_days, is_pro, is_admin, created_at, invited_by, has_pong_badge
     FROM users WHERE username = $1`,
    [username],
  );
  if (!userRows[0]) return res.status(404).json({ error: 'not_found' });

  const invitedByRows = userRows[0].invited_by
    ? await query<{ username: string }>(`SELECT username FROM users WHERE id = $1`, [userRows[0].invited_by])
    : [];

  const userId = userRows[0].id;
  const packCount = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT pack_id)::text AS count FROM pack_members WHERE user_id = $1`,
    [userId],
  );
  const countryRows = await query<{ country: string; flag: string }>(
    `SELECT DISTINCT pm.country, pm.flag
     FROM pack_members pm
     WHERE pm.user_id = $1 AND pm.country IS NOT NULL`,
    [userId],
  );
  const packedWith = await query<{ country: string; flag: string }>(
    `SELECT DISTINCT pm2.country, pm2.flag
     FROM pack_members pm1
     JOIN pack_members pm2 ON pm1.pack_id = pm2.pack_id AND pm1.user_id <> pm2.user_id
     WHERE pm1.user_id = $1 AND pm2.country IS NOT NULL`,
    [userId],
  );
  const filterRows = await query<{ filter: string; count: string }>(
    `SELECT filter, COUNT(*)::text AS count FROM photos WHERE user_id = $1 GROUP BY filter`,
    [userId],
  );
  const filterUsage: Record<string, number> = {};
  let filterTotal = 0;
  for (const r of filterRows) {
    filterUsage[r.filter] = parseInt(r.count, 10);
    filterTotal += parseInt(r.count, 10);
  }
  const vibeProfile = filterTotal > 0
    ? Object.fromEntries(Object.entries(filterUsage).map(([k, v]) => [k, v / filterTotal]))
    : {};

  return res.json({
    user: {
      username: userRows[0].username,
      avatarUrl: avatarUrl(userRows[0]),
      city: userRows[0].city,
      country: userRows[0].country,
      flag: userRows[0].flag,
      streakDays: userRows[0].streak_days,
      isPro: userRows[0].is_pro,
      isAdmin: userRows[0].is_admin,
      joinedAt: userRows[0].created_at,
      packs: parseInt(packCount[0]?.count ?? '0', 10),
      countries: countryRows.length,
      countryList: countryRows.map((r) => ({ flag: r.flag, name: r.country })),
      packedWith: packedWith.map((r) => ({ flag: r.flag, name: r.country })),
      invitedBy: invitedByRows[0]?.username ?? null,
      hasPongBadge: !!userRows[0].has_pong_badge,
      vibeProfile,
    },
  });
});

app.get('/daily-topic', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await query<{ topic: string }>(`SELECT topic FROM daily_topics WHERE topic_date = $1`, [today]);
  if (rows[0]) return res.json({ topic: rows[0].topic, date: today });
  const topics = [
    'blue', 'shadows', 'reflection', 'motion', 'texture', 'contrast', 'minimal',
    'golden hour', 'rain', 'architecture', 'street', 'portrait', 'nature', 'night',
    'food', 'travel', 'animals', 'music', 'art', 'sunset', 'coffee', 'water', 'light',
    'smile', 'friendship', 'energy', 'silence', 'pattern', 'speed', 'home',
  ];
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  const topic = topics[dayOfYear % topics.length];
  return res.json({ topic, date: today });
});

app.post('/admin/daily-topic', requireAdmin, async (req: Request, res: Response) => {
  const { topic } = req.body ?? {};
  if (!topic || typeof topic !== 'string') return res.status(400).json({ error: 'topic_required' });
  const today = new Date().toISOString().slice(0, 10);
  await query(
    `INSERT INTO daily_topics (topic_date, topic) VALUES ($1, $2)
     ON CONFLICT (topic_date) DO UPDATE SET topic = EXCLUDED.topic, created_at = NOW()`,
    [today, topic],
  );
  return res.json({ ok: true });
});

const Y = '\x1b[33m';
const R = '\x1b[0m';

const BANNER = `
    ███████╗██╗      █████╗ ███████╗██╗  ██╗${Y}.${R}
    ██╔════╝██║     ██╔══██╗██╔════╝██║  ██║${Y}.${R}
    █████╗  ██║     ███████║███████╗███████║${Y}.${R}
    ██╔══╝  ██║     ██╔══██║╚════██║██╔══██║${Y}.${R}
    ██║     ███████╗██║  ██║███████║██║  ██║${Y}.${R}
    ╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝${Y}.${R}
`;

// Global error handler for unhandled async route errors
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('unhandled route error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'internal_server_error' });
  }
});

async function start() {
  await bootstrap();
  await showGenesisCodes();

  const port = parseInt(process.env.PORT ?? '4000', 10);
  app.listen(port, () => {
    console.log(BANNER);
    console.log(`  flash. server ready    http://localhost:${port}`);
    console.log('');
    console.log('  ── public api ──');
    console.log(`  POST   /register            POST   /sign-in`);
    console.log(`  GET    /me                  POST   /me/push-token`);
    console.log(`  POST   /photos             POST   /photos/:id/revert`);
    console.log(`  GET    /packs               GET    /packs/:id`);
    console.log(`  POST   /packs/:id/react     POST   /packs/:id/comment`);
    console.log(`  POST   /reports             POST   /screenshot`);
    console.log(`  GET    /users/:username     GET    /streak`);
    console.log(`  GET    /daily-topic`);
    console.log(`  GET    /notifications       POST   /notifications/:id/read`);
    console.log('');
    console.log('  ── admin api ──');
    console.log(`  GET    /admin/stats          GET    /admin/users`);
    console.log(`  GET    /admin/genesis       POST   /admin/genesis`);
    console.log(`  GET    /admin/reports       POST   /admin/reports/:id/resolve`);
    console.log(`  DELETE /admin/users/:id      POST   /admin/users/:id/ban`);
    console.log(`  POST   /admin/users/:id/admin  POST   /admin/users/:id/pro`);
    console.log(`  POST   /admin/users/:id/reset-streak`);
    console.log(`  POST   /admin/packs/:id/reset-timer`);
    console.log(`  GET    /admin/notifications  POST   /admin/notifications`);
    console.log(`  POST   /admin/daily-topic`);
    console.log('');
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
