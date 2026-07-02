// One-time codes for login/signup verification.
//
// Codes are 6 digits, stored hashed (sha256), expire after 5 minutes, allow 5
// verify attempts and 3 sends per subject per 10 minutes. The "subject" is
// whatever the auth flow keys on today (username for login, invite code for
// signup) so no client plumbing has to change when phone collection lands.
//
// Delivery: when Twilio creds are set and the subject resolves to a user with
// a phone number, the code goes out via SMS. Otherwise the send response
// echoes the code back (devCode) so the flow stays usable end-to-end in dev
// and TestFlight builds without an SMS provider.

import { createHash, randomInt } from 'crypto';
import { query } from './db';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
const TWILIO_FROM = process.env.TWILIO_FROM ?? '';

export const OTP_TTL_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MINUTES = 10;

function hashCode(subject: string, code: string): string {
  return createHash('sha256').update(`${subject}:${code}`).digest('hex');
}

export function smsConfigured(): boolean {
  return Boolean(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);
}

async function sendSms(to: string, body: string): Promise<void> {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }).toString(),
    },
  );
  if (!res.ok) {
    throw new Error(`twilio ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

export type SendResult =
  | { ok: true; channel: 'sms' }
  | { ok: true; channel: 'dev'; devCode: string }
  | { ok: false; reason: 'rate_limited' | 'sms_failed' };

export async function sendOtp(subject: string, phone: string | null): Promise<SendResult> {
  const recent = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM auth_otps
     WHERE subject = $1 AND created_at > NOW() - ($2 || ' minutes')::interval`,
    [subject, String(SEND_WINDOW_MINUTES)],
  );
  if (parseInt(recent[0]?.count ?? '0', 10) >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, reason: 'rate_limited' };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await query(
    `INSERT INTO auth_otps(subject, code_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [subject, hashCode(subject, code), String(OTP_TTL_MINUTES)],
  );

  if (smsConfigured() && phone) {
    try {
      await sendSms(phone, `flash. code: ${code}. expires in ${OTP_TTL_MINUTES} minutes.`);
      return { ok: true, channel: 'sms' };
    } catch (e) {
      console.error('otp sms send failed:', e);
      return { ok: false, reason: 'sms_failed' };
    }
  }

  console.log(`[otp] dev code for ${subject}: ${code}`);
  return { ok: true, channel: 'dev', devCode: code };
}

export type VerifyResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts';

export async function verifyOtp(subject: string, code: string): Promise<VerifyResult> {
  const rows = await query<{ id: string; code_hash: string; expires_at: string; attempts: number }>(
    `SELECT id, code_hash, expires_at, attempts FROM auth_otps
     WHERE subject = $1 AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [subject],
  );
  const row = rows[0];
  if (!row) return 'invalid';
  if (new Date(row.expires_at).getTime() < Date.now()) return 'expired';
  if (row.attempts >= MAX_VERIFY_ATTEMPTS) return 'too_many_attempts';

  if (row.code_hash !== hashCode(subject, code)) {
    await query('UPDATE auth_otps SET attempts = attempts + 1 WHERE id = $1', [row.id]);
    return row.attempts + 1 >= MAX_VERIFY_ATTEMPTS ? 'too_many_attempts' : 'invalid';
  }

  await query('UPDATE auth_otps SET consumed_at = NOW() WHERE id = $1', [row.id]);
  return 'ok';
}
