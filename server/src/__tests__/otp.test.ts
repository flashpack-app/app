jest.mock('../db', () => ({ query: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { query } = require('../db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { sendOtp, verifyOtp } = require('../otp');

const mockQuery = query as jest.Mock;

describe('sendOtp', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns a 6-digit dev code when no SMS provider is configured', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT')) return [{ count: '0' }];
      return [];
    });
    const res = await sendOtp('user:tester', null);
    expect(res.ok).toBe(true);
    expect(res.channel).toBe('dev');
    expect(res.devCode).toMatch(/^\d{6}$/);
  });

  it('rate-limits after too many sends in the window', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT')) return [{ count: '3' }];
      return [];
    });
    const res = await sendOtp('user:tester', null);
    expect(res).toEqual({ ok: false, reason: 'rate_limited' });
  });
});

describe('verifyOtp', () => {
  beforeEach(() => mockQuery.mockReset());

  async function issueCode(subject: string): Promise<{ code: string; hash: string }> {
    let hash = '';
    mockQuery.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('COUNT')) return [{ count: '0' }];
      if (sql.includes('INSERT INTO auth_otps')) {
        hash = params[1];
        return [];
      }
      return [];
    });
    const res = await sendOtp(subject, null);
    return { code: res.devCode, hash };
  }

  it('accepts the issued code and consumes it', async () => {
    const { code, hash } = await issueCode('user:tester');
    const consumed: string[] = [];
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, code_hash')) {
        return [{ id: 'otp1', code_hash: hash, expires_at: new Date(Date.now() + 60_000).toISOString(), attempts: 0 }];
      }
      if (sql.includes('consumed_at = NOW()')) {
        consumed.push(sql);
        return [];
      }
      return [];
    });
    expect(await verifyOtp('user:tester', code)).toBe('ok');
    expect(consumed).toHaveLength(1);
  });

  it('rejects a wrong code and counts the attempt', async () => {
    const { code, hash } = await issueCode('user:tester');
    const wrong = code === '000000' ? '111111' : '000000';
    let attemptBumped = false;
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, code_hash')) {
        return [{ id: 'otp1', code_hash: hash, expires_at: new Date(Date.now() + 60_000).toISOString(), attempts: 0 }];
      }
      if (sql.includes('attempts = attempts + 1')) {
        attemptBumped = true;
        return [];
      }
      return [];
    });
    expect(await verifyOtp('user:tester', wrong)).toBe('invalid');
    expect(attemptBumped).toBe(true);
  });

  it('rejects expired codes', async () => {
    const { code, hash } = await issueCode('user:tester');
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, code_hash')) {
        return [{ id: 'otp1', code_hash: hash, expires_at: new Date(Date.now() - 1000).toISOString(), attempts: 0 }];
      }
      return [];
    });
    expect(await verifyOtp('user:tester', code)).toBe('expired');
  });

  it('locks out after max attempts', async () => {
    const { code, hash } = await issueCode('user:tester');
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, code_hash')) {
        return [{ id: 'otp1', code_hash: hash, expires_at: new Date(Date.now() + 60_000).toISOString(), attempts: 5 }];
      }
      return [];
    });
    expect(await verifyOtp('user:tester', code)).toBe('too_many_attempts');
  });

  it('treats an unknown subject as invalid', async () => {
    mockQuery.mockImplementation(async () => []);
    expect(await verifyOtp('user:nobody', '123456')).toBe('invalid');
  });
});
