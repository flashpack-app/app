// Test ML-based image moderation — two-step approach:
// 1. omni-moderation for non-sexual categories + sexual/minors zero-tolerance
// 2. GPT-4o-mini vision YES/NO check when sexual score >= 0.3
process.env.OPENAI_API_KEY = 'mock-openai-key';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

jest.resetModules();
const { moderateImage } = require('../moderation');

// Helper: builds a standard omni-moderation response
function omniResponse(categories: Record<string, boolean>, category_scores: Record<string, number>) {
  return {
    ok: true,
    json: () => Promise.resolve({ results: [{ flagged: false, categories, category_scores }] }),
  };
}

// Helper: builds a vision YES/NO response
function visionResponse(answer: 'YES' | 'NO') {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content: answer } }],
      }),
  };
}

describe('moderateImage — two-step vision approach', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('allows a clean photo (low sexual score, no vision call needed)', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ sexual: false }, { sexual: 0.05 }),
    );

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1); // only omni, no vision
  });

  it('triggers vision check when sexual score >= 0.3', async () => {
    mockFetch
      .mockResolvedValueOnce(omniResponse({ sexual: true }, { sexual: 0.78 }))
      .mockResolvedValueOnce(visionResponse('NO')); // vision says not explicit

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2); // omni + vision
  });

  it('blocks when vision says YES (explicit nudity)', async () => {
    mockFetch
      .mockResolvedValueOnce(omniResponse({ sexual: true }, { sexual: 0.92 }))
      .mockResolvedValueOnce(visionResponse('YES'));

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual');
    expect(v.source).toBe('ml');
  });

  it('allows bikini/swimwear — high sexual score but vision says NO', async () => {
    mockFetch
      .mockResolvedValueOnce(omniResponse({ sexual: true }, { sexual: 0.88 }))
      .mockResolvedValueOnce(visionResponse('NO'));

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(v.categories).toEqual([]);
  });

  it('blocks when a non-sexual category is flagged (no vision call needed)', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ violence: true, sexual: false }, { violence: 0.9, sexual: 0.05 }),
    );

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('violence');
    expect(mockFetch).toHaveBeenCalledTimes(1); // blocked at step 1, no vision
  });

  it('blocks sexual/minors with zero-tolerance (no vision call needed)', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ 'sexual/minors': true }, { 'sexual/minors': 0.15 }),
    );

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual/minors');
    expect(mockFetch).toHaveBeenCalledTimes(1); // blocked at step 1
  });

  it('blocks sexual/minors even when score is just above zero', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ 'sexual/minors': false }, { 'sexual/minors': 0.001 }),
    );

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual/minors');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skips vision call when sexual score is below 0.3 (cost optimisation)', async () => {
    mockFetch.mockResolvedValueOnce(
      omniResponse({ sexual: false }, { sexual: 0.29 }),
    );

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to fail-open if vision check throws', async () => {
    mockFetch
      .mockResolvedValueOnce(omniResponse({ sexual: true }, { sexual: 0.78 }))
      .mockRejectedValueOnce(new Error('network error'));

    const v = await moderateImage('base64data', 'image/jpeg');
    // failVerdict with no MODERATION_FAIL_CLOSED → fail-open (safe)
    expect(v.source).toBe('fail-open');
    expect(v.safe).toBe(true);
  });
});
