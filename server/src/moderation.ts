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

import { pool, query } from './db';

export interface ModerationVerdict {
  safe: boolean;
  categories: string[];
  source: 'ml' | 'heuristic' | 'fail-open' | 'fail-closed';
}

// Comprehensive banned terms - profanity, hate speech, slurs
const BANNED_TERMS = [
  // Self-harm/suicide
  'kill yourself', 'kys', 'commit suicide', 'end it all', 'go kill yourself',
  // Sexual violence
  'rape', 'rapist', 'sexual assault', 'molest',
  // Racial slurs
  'nigger', 'nigga', 'nig', 'nigers', 'niggas',
  'faggot', 'fag', 'faggot', 'fags',
  'kike', 'kikes', 'heeb', 'hebe',
  'chink', 'chinks', 'gook', 'gooks',
  'spic', 'spics', 'wetback', 'wetbacks',
  'beaner', 'beaners',
  'coon', 'coons', 'jigaboo', 'jigaboos',
  'sand nigger', 'sand niggers', 'towelhead', 'towelheads',
  'paki', 'pakis',
  'raghead', 'ragheads',
  // Gender/sexual slurs
  'whore', 'whores', 'slut', 'sluts', 'cunt', 'cunts',
  'tranny', 'trannies', 'shemale', 'shemales',
  'bitch', 'bitches', 'ho', 'hos',
  // Ableist slurs
  'retard', 'retards', 'retarded', 'mongoloid', 'mongoloids',
  // Religious slurs
  'muslim scum', 'muslim trash',
  // General profanity
  'fuck you', 'motherfucker', 'motherfuckers',
  'dickhead', 'dickheads',
  'bastard', 'bastards',
  'piss', 'pissed', 'piss off',
  'twat', 'twats',
  'wanker', 'wankers',
  // Violent threats
  'i will kill you', 'i will find you', 'i will hurt you',
  'die', 'die in a fire', 'burn in hell',
  // Hate phrases
  'all [race] should die', 'all [race] must die', 'gas the',
  'white power', 'black power', 'supremacist',
];

const BANNED_RE = new RegExp(`\\b(${BANNED_TERMS.map((t) => t.replace(/ /g, '\\s+')).join('|')})\\b`, 'i');

// URL/Link detection patterns
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /\.[a-z]{2,}(?:\/[^\s]*)?/gi,
  /bit\.ly\/[^\s]+/gi,
  /tinyurl\.com\/[^\s]+/gi,
  /t\.me\/[^\s]+/gi,
  /discord\.gg\/[^\s]+/gi,
  /instagram\.com\/[^\s]+/gi,
  /twitter\.com\/[^\s]+/gi,
  /x\.com\/[^\s]+/gi,
  /facebook\.com\/[^\s]+/gi,
  /tiktok\.com\/[^\s]+/gi,
  /snapchat\.com\/[^\s]+/gi,
  /telegram\.me\/[^\s]+/gi,
];

// Spam detection patterns
const SPAM_PATTERNS = [
  /(.)\1{4,}/g, // 5+ repeated characters
  /\b(buy|sell|cheap|free|discount|offer|deal|winner|congratulations|click here|subscribe|follow)\b/gi,
  /\b(viagra|cialis|crypto|bitcoin|ethereum|nft|investment)\b/gi,
  /\b(onlyfans|fansly|patreon)\b/gi,
  /\b(scam|fraud|hack|cheat|exploit)\b/gi,
];

// In-memory rate limiting for spam detection
const userCommentCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_COMMENTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

export function heuristicTextVerdict(text: string): ModerationVerdict {
  const categories: string[] = [];

  // Check for banned terms
  if (BANNED_RE.test(text)) {
    categories.push('banned_term');
  }

  // Check for URLs/links
  for (const pattern of URL_PATTERNS) {
    if (pattern.test(text)) {
      categories.push('url_link');
      break;
    }
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      categories.push('spam_pattern');
      break;
    }
  }

  return { safe: categories.length === 0, categories, source: 'heuristic' };
}

// Rate limit check for spam prevention
export function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const userState = userCommentCounts.get(userId);

  if (!userState || now > userState.resetTime) {
    // Reset or initialize
    userCommentCounts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (userState.count >= MAX_COMMENTS_PER_MINUTE) {
    return { allowed: false, reason: 'rate_limit_exceeded' };
  }

  userState.count++;
  return { allowed: true };
}

// Record a moderation violation in the database
export async function recordViolation(params: {
  userId: string;
  category: string;
  contentType: 'text' | 'image';
  packId?: string;
  commentId?: string;
  photoId?: string;
}): Promise<void> {
  const { userId, category, contentType, packId, commentId, photoId } = params;

  await query(
    `INSERT INTO moderation_violations (user_id, category, content_type, pack_id, comment_id, photo_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, category, contentType, packId || null, commentId || null, photoId || null]
  );

  // Update user violation count
  await query(
    `UPDATE users
     SET violation_count = violation_count + 1,
         last_violation_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

// Check if user should be auto-banned based on violation count
const VIOLATION_THRESHOLD = 10; // Auto-ban after 10 violations
export async function shouldAutoBan(userId: string): Promise<boolean> {
  const result = await query<{ violation_count: number }>(
    'SELECT violation_count FROM users WHERE id = $1',
    [userId]
  );

  if (!result.length) return false;
  return result[0].violation_count >= VIOLATION_THRESHOLD;
}

interface OpenAIModerationResult {
  results: Array<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Calls omni-moderation with up to 3 attempts and exponential backoff on 429.
async function callOpenAI(input: any): Promise<{
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}> {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(MODERATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: 'omni-moderation-latest', input }),
    });

    if (res.status === 429) {
      if (attempt < MAX_ATTEMPTS) {
        const backoff = attempt * 1000; // 1s, 2s
        console.warn(`[moderation] 429 rate limit, retrying in ${backoff}ms (attempt ${attempt}/${MAX_ATTEMPTS})`);
        await sleep(backoff);
        continue;
      }
      // All retries exhausted — throw with a recognizable marker
      throw Object.assign(
        new Error(`moderation API 429: ${(await res.text()).slice(0, 200)}`),
        { isRateLimit: true },
      );
    }

    if (!res.ok) {
      throw new Error(`moderation API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }

    const data = (await res.json()) as OpenAIModerationResult;
    const r = data.results?.[0];
    if (!r) throw new Error('moderation API returned no results');
    return r;
  }

  // Unreachable but satisfies TS
  throw new Error('moderation API failed after all retries');
}

function failVerdict(e: unknown): ModerationVerdict {
  console.error('moderation call failed:', e);
  // Rate limit (429) is a capacity issue, not a safety breach — always fail-open
  // so users aren't blocked simply because OpenAI is throttling us.
  const isRateLimit = (e as any)?.isRateLimit === true;
  if (isRateLimit) {
    console.warn('[moderation] rate-limited by OpenAI — failing open');
    return { safe: true, categories: [], source: 'fail-open' };
  }
  return FAIL_CLOSED
    ? { safe: false, categories: ['moderation_unavailable'], source: 'fail-closed' }
    : { safe: true, categories: [], source: 'fail-open' };
}

export async function moderateText(text: string): Promise<ModerationVerdict> {
  const heuristic = heuristicTextVerdict(text);
  if (!heuristic.safe) return heuristic;
  if (!OPENAI_API_KEY) return heuristic;
  try {
    const r = await callOpenAI(text);
    const categories = Object.entries(r.categories ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);
    return { safe: !r.flagged, categories, source: 'ml' };
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
    const r = await callOpenAI([
      {
        type: 'image_url',
        image_url: { url: `data:${mime || 'image/jpeg'};base64,${base64}` },
      },
    ]);

    // sexual/minors: zero tolerance regardless of score
    const isSexualMinorsBlocked =
      r.categories['sexual/minors'] === true || (r.category_scores['sexual/minors'] ?? 0) > 0;

    // sexual: use a high threshold — bikinis score 0.50–0.90, explicit nudity 0.97–1.00.
    // Default 0.95 sits cleanly between them. Configurable via MODERATION_SEXUAL_THRESHOLD.
    const sexualThreshold = parseFloat(process.env.MODERATION_SEXUAL_THRESHOLD ?? '0.95');
    const isSexualBlocked = (r.category_scores?.sexual ?? 0) >= sexualThreshold;

    // all other categories: block if omni-moderation flags them
    const isOtherBlocked = Object.entries(r.categories ?? {}).some(
      ([cat, flagged]) => cat !== 'sexual' && cat !== 'sexual/minors' && flagged,
    );

    const categories: string[] = [];
    if (isSexualMinorsBlocked) categories.push('sexual/minors');
    if (isSexualBlocked) categories.push('sexual');
    for (const [cat, flagged] of Object.entries(r.categories ?? {})) {
      if (cat !== 'sexual' && cat !== 'sexual/minors' && flagged) categories.push(cat);
    }

    const safe = !isSexualMinorsBlocked && !isSexualBlocked && !isOtherBlocked;
    return { safe, categories, source: 'ml' };
  } catch (e) {
    return failVerdict(e);
  }
}

