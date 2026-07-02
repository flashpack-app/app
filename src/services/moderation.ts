// Client-side moderation is a fast first pass for instant UX feedback.
// The authoritative check runs server-side (ML via the moderation service
// when configured) on photo upload and comment endpoints — the client
// surfaces the 422 rejections those return.

// Word-boundary matching so "kill" doesn't flag "skill" or "die" flag "diet".
const BANNED_TERMS = [
  'kill yourself', 'kys', 'rape', 'nigger', 'nigga', 'faggot', 'kike',
  'chink', 'spic', 'whore', 'slut', 'cunt', 'retard', 'tranny', 'beaner',
];
const BANNED_RE = new RegExp(
  `\\b(${BANNED_TERMS.map((t) => t.replace(/ /g, '\\s+')).join('|')})\\b`,
  'i',
);

export const ModerationService = {
  isTextSafe(text: string): boolean {
    return !BANNED_RE.test(text);
  },
};
