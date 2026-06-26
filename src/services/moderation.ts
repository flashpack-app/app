// On-device moderation stubs. The Swift target uses Vision + NaturalLanguage;
// the Expo build keeps these as lightweight heuristics so the UX flow stays intact.

const BANNED_TERMS = [
  'kill', 'die', 'rape', 'nigger', 'faggot', 'kike', 'chink', 'spic',
  'whore', 'slut', 'cunt', 'retard',
];

export const ModerationService = {
  async isImageSafe(_uri: string): Promise<boolean> {
    // Hook for native module / remote ML. Default allow.
    return true;
  },

  isTextSafe(text: string): boolean {
    const t = text.toLowerCase();
    return !BANNED_TERMS.some((w) => t.includes(w));
  },
};
