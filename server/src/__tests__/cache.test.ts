// Exercises the in-process fallback (no REDIS_URL) — same semantics the
// Redis path follows.
delete process.env.REDIS_URL;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cacheGet, cacheSet, cacheDel, cachedJson, packKey, userKey, invalidatePack, invalidateUser } = require('../cache');

describe('cache fallback', () => {
  it('round-trips JSON values', async () => {
    await cacheSet('t:round', { a: 1, b: ['x'] }, 60);
    expect(await cacheGet('t:round')).toEqual({ a: 1, b: ['x'] });
  });

  it('misses return null', async () => {
    expect(await cacheGet('t:missing')).toBeNull();
  });

  it('expires after the TTL', async () => {
    await cacheSet('t:ttl', 'v', 0.05);
    await new Promise((r) => setTimeout(r, 120));
    expect(await cacheGet('t:ttl')).toBeNull();
  });

  it('deletes keys', async () => {
    await cacheSet('t:del', 1, 60);
    await cacheDel('t:del');
    expect(await cacheGet('t:del')).toBeNull();
  });
});

describe('cachedJson', () => {
  it('calls the loader once until invalidated', async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return { calls };
    };
    expect(await cachedJson('t:loader', 60, loader)).toEqual({ calls: 1 });
    expect(await cachedJson('t:loader', 60, loader)).toEqual({ calls: 1 });
    await cacheDel('t:loader');
    expect(await cachedJson('t:loader', 60, loader)).toEqual({ calls: 2 });
  });

  it('does not cache null loader results', async () => {
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return null;
    };
    await cachedJson('t:null', 60, loader);
    await cachedJson('t:null', 60, loader);
    expect(calls).toBe(2);
  });
});

describe('invalidation helpers', () => {
  it('clears pack payloads', async () => {
    await cacheSet(packKey('p1'), { id: 'p1' }, 60);
    await invalidatePack('p1');
    expect(await cacheGet(packKey('p1'))).toBeNull();
  });

  it('clears user rows', async () => {
    await cacheSet(userKey('u1'), { id: 'u1' }, 60);
    await invalidateUser('u1');
    expect(await cacheGet(userKey('u1'))).toBeNull();
  });
});
