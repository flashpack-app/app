// We test the internal helpers exported/used by api.ts. Since mapUser, mapPack,
// absoluteUrl, etc. are module-private, we test them via the exported APIService
// methods by mocking fetch.

import { HTTPError } from '../api';

// We need to re-import to get the module after mocks are set up
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('HTTPError', () => {
  it('stores status and body', () => {
    const err = new HTTPError(404, { error: 'not found' });
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ error: 'not found' });
    expect(err.message).toBe('not found');
  });

  it('uses generic message when body.error is not a string', () => {
    const err = new HTTPError(500, { detail: 'something' });
    expect(err.message).toBe('HTTP 500');
    expect(err.status).toBe(500);
  });

  it('uses generic message when body is null', () => {
    const err = new HTTPError(503, null);
    expect(err.message).toBe('HTTP 503');
  });

  it('is an instance of Error', () => {
    const err = new HTTPError(400, {});
    expect(err).toBeInstanceOf(Error);
  });
});

describe('APIService.login', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('calls /auth/login and maps the user', async () => {
    const { APIService } = require('../api');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        user: {
          id: 'u-1',
          username: 'testuser',
          is_admin: false,
          invite_code: 'FLASH-ABC-12',
          invite_slots: 3,
          streak_days: 5,
          created_at: '2024-01-01',
          city: 'london',
          country: 'GB',
          flag: '🇬🇧',
        },
        token: 'tok-123',
      }),
    });

    const result = await APIService.login('testuser');
    expect(result.token).toBe('tok-123');
    expect(result.user.username).toBe('testuser');
    expect(result.user.isAdmin).toBe(false);
    expect(result.user.inviteCode).toBe('FLASH-ABC-12');
    expect(result.user.streakDays).toBe(5);
    expect(result.user.city).toBe('london');
  });

  it('throws HTTPError on failure', async () => {
    const { APIService } = require('../api');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'user not found' }),
    });

    await expect(APIService.login('nobody')).rejects.toThrow('user not found');
  });
});

describe('APIService.verifyInvite', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns verify result', async () => {
    const { APIService } = require('../api');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: true, kind: 'genesis' }),
    });

    const result = await APIService.verifyInvite('FLASH-ABC-12');
    expect(result.valid).toBe(true);
    expect(result.kind).toBe('genesis');
  });
});

describe('APIService.getPacks', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('maps pack data correctly', async () => {
    const { APIService } = require('../api');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        packs: [{
          id: 'pack-1',
          number: 1,
          members: [{ id: 'm1', username: 'user1', avatarUrl: '/avatars/m1' }],
          photos: [{ id: 'p1', userId: 'u1', imageURL: '/photos/p1/raw', filter: 'cinema', capturedAt: '2024-01-01', expiresAt: '2024-01-02' }],
          chemistryScore: 85,
          createdAt: '2024-01-01',
          expiresAt: '2024-01-02',
          status: 'active',
          countriesCount: 2,
          apartMinutes: 10,
        }],
      }),
    });

    const packs = await APIService.getPacks('tok-123');
    expect(packs).toHaveLength(1);
    expect(packs[0].id).toBe('pack-1');
    expect(packs[0].chemistryScore).toBe(85);
    expect(packs[0].photos[0].imageURL).toContain('/photos/p1/raw');
  });
});
