// ML moderation with a heuristic fallback.
//
// When OPENAI_API_KEY is set, text and images run through OpenAI's
// omni-moderation-latest model (free tier, covers hate/sexual/violence/
// self-harm/harassment for both modalities). Without a key — or when the
// API call fails and MODERATION_FAIL_CLOSED is not set — we fall back to
// the word-boundary heuristic so dev environments keep working.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? process.env.MODERATION_API_KEY ?? '';
const FAIL_CLOSED = process.env.MODERATION_FAIL_CLOSED === 'true';
const MODERATION_URL = 'https://api.openai.com/v1/moderations';

export interface ModerationVerdict {
  safe: boolean;
  categories: string[];
  source: 'ml' | 'heuristic' | 'fail-open' | 'fail-closed';
}

// Word-boundary matching so "kill" doesn't flag "skill" or "die" flag "diet".
const BANNED_TERMS = [
  'kill yourself', 'kys', 'rape', 'nigger', 'nigga', 'faggot', 'kike',
  'chink', 'spic', 'whore', 'slut', 'cunt', 'retard', 'tranny', 'beaner',
];
const BANNED_RE = new RegExp(`\\b(${BANNED_TERMS.map((t) => t.replace(/ /g, '\\s+')).join('|')})\\b`, 'i');

export function heuristicTextVerdict(text: string): ModerationVerdict {
  const flagged = BANNED_RE.test(text);
  return { safe: !flagged, categories: flagged ? ['banned_term'] : [], source: 'heuristic' };
}

interface OpenAIModerationResult {
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
  }>;
}

async function callOpenAI(input: any): Promise<ModerationVerdict> {
  const res = await fetch(MODERATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'omni-moderation-latest', input }),
  });
  if (!res.ok) {
    throw new Error(`moderation API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as OpenAIModerationResult;
  const r = data.results?.[0];
  if (!r) throw new Error('moderation API returned no results');
  const categories = Object.entries(r.categories ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k);
  return { safe: !r.flagged, categories, source: 'ml' };
}

function failVerdict(e: unknown): ModerationVerdict {
  console.error('moderation call failed:', e);
  return FAIL_CLOSED
    ? { safe: false, categories: ['moderation_unavailable'], source: 'fail-closed' }
    : { safe: true, categories: [], source: 'fail-open' };
}

export async function moderateText(text: string): Promise<ModerationVerdict> {
  const heuristic = heuristicTextVerdict(text);
  if (!heuristic.safe) return heuristic;
  if (!OPENAI_API_KEY) return heuristic;
  try {
    return await callOpenAI(text);
  } catch (e) {
    return failVerdict(e);
  }
}

export async function moderateImage(base64: string, mime: string): Promise<ModerationVerdict> {
  if (!OPENAI_API_KEY) {
    // No provider configured: keep the previous allow behaviour in dev.
    return { safe: true, categories: [], source: 'heuristic' };
  }
  try {
    return await callOpenAI([
      {
        type: 'image_url',
        image_url: { url: `data:${mime || 'image/jpeg'};base64,${base64}` },
      },
    ]);
  } catch (e) {
    return failVerdict(e);
  }
}
