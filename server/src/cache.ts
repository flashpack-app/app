// Shared cache for hot reads. With REDIS_URL set this is Redis (shared across
// instances); without it, a small in-process TTL map keeps the same semantics
// for local dev. Cache failures never break a request — every helper falls
// back to the underlying loader.

import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL ?? '';

let client: RedisClientType | null = null;
let connecting: Promise<void> | null = null;

async function redis(): Promise<RedisClientType | null> {
  if (!REDIS_URL) return null;
  if (client?.isReady) return client;
  if (!client) {
    client = createClient({
      url: REDIS_URL,
      socket: { reconnectStrategy: (retries) => Math.min(retries * 200, 5000) },
    });
    client.on('error', (e) => console.warn('redis error:', e?.message ?? e));
  }
  if (!connecting) {
    connecting = client.connect().then(
      () => undefined,
      (e) => {
        console.warn('redis connect failed:', e?.message ?? e);
        connecting = null;
      },
    );
  }
  await connecting;
  return client.isReady ? client : null;
}

// In-process fallback with the same TTL behaviour.
const localCache = new Map<string, { value: string; expiresAt: number }>();
const LOCAL_MAX_KEYS = 5000;

function localGet(key: string): string | null {
  const hit = localCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    localCache.delete(key);
    return null;
  }
  return hit.value;
}

function localSet(key: string, value: string, ttlSeconds: number) {
  if (localCache.size >= LOCAL_MAX_KEYS) {
    // Cheap pressure valve: drop the oldest insertions.
    for (const k of localCache.keys()) {
      localCache.delete(k);
      if (localCache.size < LOCAL_MAX_KEYS * 0.9) break;
    }
  }
  localCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const r = await redis();
    const raw = r ? await r.get(key) : localGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.warn('cacheGet failed for', key, e);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    const r = await redis();
    if (r) await r.set(key, raw, { EX: ttlSeconds });
    else localSet(key, raw, ttlSeconds);
  } catch (e) {
    console.warn('cacheSet failed for', key, e);
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!keys.length) return;
  try {
    const r = await redis();
    if (r) await r.del(keys);
    else keys.forEach((k) => localCache.delete(k));
  } catch (e) {
    console.warn('cacheDel failed for', keys.join(','), e);
  }
}

// Read-through helper: returns the cached value or runs the loader and caches it.
export async function cachedJson<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSeconds);
  }
  return value;
}

export const packKey = (packId: string) => `pack:v1:${packId}`;
export const userKey = (userId: string) => `user:v1:${userId}`;

export async function invalidatePack(packId: string): Promise<void> {
  await cacheDel(packKey(packId));
}

export async function invalidateUser(userId: string): Promise<void> {
  await cacheDel(userKey(userId));
}
