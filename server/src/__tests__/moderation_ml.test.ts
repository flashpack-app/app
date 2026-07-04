// Test ML-based image moderation:
// - omni-moderation only (no vision step)
// - sexual score >= 0.95 threshold (configurable via MODERATION_SEXUAL_THRESHOLD)
// - sexual/minors: zero tolerance (any score > 0 blocks)
// - all other categories: block if flagged
// - 429 rate limit: retries with backoff, then fails-open regardless of MODERATION_FAIL_CLOSED
process.env.OPENAI_API_KEY = 'mock-openai-key';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

jest.resetModules();
const { moderateImage } = require('../moderation');

// Helper: single omni-moderation response
function omniResponse(categories: Record<string, boolean>, category_scores: Record<string, number>) {
  return {
    ok: true,
    json: () => Promise.resolve({ results: [{ flagged: false, categories, category_scores }] }),
  };
}

function rateLimitResponse() {
  return {
    ok: false,
    status: 429,
    text: () => Promise.resolve('{"error":{"message":"Too Many Requests"}}'),
  };
}

describe('moderateImage — omni-moderation with 0.95 sexual threshold', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    delete process.env.MODERATION_SEXUAL_THRESHOLD;
    delete process.env.MODERATION_FAIL_CLOSED;
  });

  it('allows a clean photo (low sexual score)', async () => {
    mockFetch.mockResolvedValueOnce(omniResponse({ sexual: false }, { sexual: 0.05 }));
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('allows a bikini/swimwear photo (sexual score 0.88 < 0.95 threshold)', async () => {
    mockFetch.mockResolvedValueOnce(omniResponse({ sexual: true }, { sexual: 0.88 }));
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(v.categories).toEqual([]);
  });

  it('blocks explicit nudity when sexual score >= 0.95 (default threshold)', async () => {
    mockFetch.mockResolvedValueOnce(omniResponse({ sexual: true }, { sexual: 0.97 }));
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual');
    expect(v.source).toBe('ml');
  });

  it('blocks when a non-sexual category is flagged', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ violence: true, sexual: false }, { violence: 0.9, sexual: 0.05 }),
    );
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('violence');
    expect(v.categories).not.toContain('sexual');
  });

  it('blocks sexual/minors with zero-tolerance when categories entry is true', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ 'sexual/minors': true }, { 'sexual/minors': 0.15 }),
    );
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual/minors');
  });

  it('blocks sexual/minors even when score is just above zero (zero tolerance)', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ 'sexual/minors': false }, { 'sexual/minors': 0.001 }),
    );
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual/minors');
  });

  it('honours a custom MODERATION_SEXUAL_THRESHOLD env variable', async () => {
    process.env.MODERATION_SEXUAL_THRESHOLD = '0.80';
    // score 0.85 is above 0.80 so should block
    mockFetch.mockResolvedValueOnce(omniResponse({ sexual: true }, { sexual: 0.85 }));
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual');
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(rateLimitResponse())
      .mockResolvedValueOnce(omniResponse({ sexual: false }, { sexual: 0.05 }));
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails-open after all 429 retries exhausted, even with MODERATION_FAIL_CLOSED=true', async () => {
    process.env.MODERATION_FAIL_CLOSED = 'true';
    mockFetch
      .mockResolvedValueOnce(rateLimitResponse())
      .mockResolvedValueOnce(rateLimitResponse())
      .mockResolvedValueOnce(rateLimitResponse());
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true); // rate limit is capacity issue, not safety breach
    expect(v.source).toBe('fail-open');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('respects MODERATION_FAIL_CLOSED=true for real API errors (non-429)', async () => {
    process.env.MODERATION_FAIL_CLOSED = 'true';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('internal server error'),
    });
    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.source).toBe('fail-closed');
  });
});
