// Invite code helpers. Format: FLASH-XXX-XX (uppercase alphanumeric, no ambiguous chars).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // skip 0/O, 1/I

function rand(n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

export function generateInviteCode(): string {
  return `FLASH-${rand(3)}-${rand(2)}`;
}

const FORMAT = /^FLASH-[A-Z0-9]{3}-[A-Z0-9]{2}$/;

// Accept any separator on input (-, ·, _, space, none) — normalize to dash.
export function normalize(code: string): string {
  const stripped = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!stripped.startsWith('FLASH')) return code.trim().toUpperCase();
  const rest = stripped.slice(5);
  if (rest.length < 5) return `FLASH-${rest}`;
  return `FLASH-${rest.slice(0, 3)}-${rest.slice(3, 5)}`;
}

export function isValidFormat(code: string): boolean {
  return FORMAT.test(normalize(code));
}
