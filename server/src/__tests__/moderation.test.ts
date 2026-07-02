// The module reads its keys at import time — clear them first so these tests
// exercise the no-key fallback path regardless of the host environment.
delete process.env.OPENAI_API_KEY;
delete process.env.MODERATION_API_KEY;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { heuristicTextVerdict, moderateText, moderateImage } = require('../moderation');

describe('heuristicTextVerdict', () => {
  it('passes clean text', () => {
    expect(heuristicTextVerdict('nice shot, love the colors').safe).toBe(true);
  });

  it('flags slurs on word boundaries', () => {
    const v = heuristicTextVerdict('what a retard');
    expect(v.safe).toBe(false);
    expect(v.categories).toContain('banned_term');
    expect(v.source).toBe('heuristic');
  });

  it('does not flag innocent words containing banned substrings', () => {
    expect(heuristicTextVerdict('skilled worker on a diet').safe).toBe(true);
  });

  it('matches multi-word phrases with variable whitespace', () => {
    expect(heuristicTextVerdict('kill   yourself').safe).toBe(false);
  });
});

describe('moderateText without an API key', () => {
  it('falls back to the heuristic', async () => {
    const v = await moderateText('hello there');
    expect(v.safe).toBe(true);
    expect(v.source).toBe('heuristic');
  });

  it('still blocks banned terms', async () => {
    const v = await moderateText('you whore');
    expect(v.safe).toBe(false);
  });
});

describe('moderateImage without an API key', () => {
  it('keeps the allow behaviour so dev environments work', async () => {
    const v = await moderateImage('aGVsbG8=', 'image/jpeg');
    expect(v.safe).toBe(true);
  });
});
