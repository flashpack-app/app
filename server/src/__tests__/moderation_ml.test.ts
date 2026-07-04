// Test ML-based flexible moderation path (with simulated API keys)
process.env.OPENAI_API_KEY = 'mock-openai-key';

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Reset module registry so moderation.ts reads the env keys we set above
jest.resetModules();
const { moderateImage } = require('../moderation');

describe('ML moderateImage with custom sexual score threshold', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    delete process.env.MODERATION_SEXUAL_THRESHOLD;
  });

  it('blocks when a non-sexual category is flagged', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              flagged: true,
              categories: {
                sexual: false,
                violence: true,
                hate: false,
              },
              category_scores: {
                sexual: 0.1,
                violence: 0.85,
                hate: 0.05,
              },
            },
          ],
        }),
    });

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('violence');
    expect(v.categories).not.toContain('sexual');
    expect(v.source).toBe('ml');
  });

  it('blocks when sexual category is flagged and score is above default 0.7 threshold', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              flagged: true,
              categories: {
                sexual: true,
                violence: false,
              },
              category_scores: {
                sexual: 0.78,
                violence: 0.01,
              },
            },
          ],
        }),
    });

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual');
  });

  it('allows when sexual category is flagged but score is below default 0.7 threshold (swimwear)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              flagged: true,
              categories: {
                sexual: true,
                violence: false,
              },
              category_scores: {
                sexual: 0.54,
                violence: 0.01,
              },
            },
          ],
        }),
    });

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(true);
    expect(v.categories).toEqual([]);
  });

  it('blocks when sexual/minors is flagged (zero tolerance)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              flagged: true,
              categories: {
                'sexual/minors': true,
              },
              category_scores: {
                'sexual/minors': 0.12,
              },
            },
          ],
        }),
    });

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual/minors');
  });

  it('blocks when sexual/minors score is greater than zero even if categories entry is false (zero tolerance)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              flagged: false,
              categories: {
                'sexual/minors': false,
              },
              category_scores: {
                'sexual/minors': 0.01,
              },
            },
          ],
        }),
    });

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual/minors');
  });

  it('honors a custom MODERATION_SEXUAL_THRESHOLD env variable', async () => {
    process.env.MODERATION_SEXUAL_THRESHOLD = '0.4';

    // This score of 0.5 is above the custom threshold 0.4, so it should be blocked.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              flagged: true,
              categories: {
                sexual: true,
              },
              category_scores: {
                sexual: 0.5,
              },
            },
          ],
        }),
    });

    const v = await moderateImage('base64data', 'image/jpeg');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('sexual');
  });
});
