// One-time codes for login/signup verification using Twilio Verify API.
//
// Twilio Verify handles code generation, rate limiting, and delivery automatically.
// We just need to call the verification endpoints.

import { query } from './db';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID ?? '';
const OTP_DEV_MODE = process.env.OTP_DEV_MODE === 'true';

export const OTP_TTL_MINUTES = 5;

export function verifyConfigured(): boolean {
  return Boolean(TWILIO_SID && TWILIO_TOKEN && VERIFY_SERVICE_SID);
}

async function createVerification(to: string, channel: 'sms' | 'email' = 'sms'): Promise<{ success: boolean; sid?: string; error?: string }> {
  console.log(`[otp] creating verification for: ${to}, channel: ${channel}`);
  
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/Verifications`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, Channel: channel }).toString(),
    },
  );
  
  const responseText = await res.text();
  console.log(`[otp] Twilio Verify response status: ${res.status}, body: ${responseText}`);
  
  if (!res.ok) {
    return { success: false, error: responseText };
  }
  
  const data = JSON.parse(responseText);
  return { success: true, sid: data.sid };
}

async function checkVerification(to: string, code: string): Promise<{ success: boolean; error?: string }> {
  console.log(`[otp] checking verification for: ${to}, code: ${code}`);
  
  const res = await fetch(
    `https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/VerificationCheck`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, Code: code }).toString(),
    },
  );
  
  const responseText = await res.text();
  console.log(`[otp] Twilio Verify Check response status: ${res.status}, body: ${responseText}`);
  
  if (!res.ok) {
    return { success: false, error: responseText };
  }
  
  const data = JSON.parse(responseText);
  return { success: data.status === 'approved', error: data.status !== 'approved' ? data.status : undefined };
}

export type SendResult =
  | { ok: true; channel: 'sms' }
  | { ok: true; channel: 'dev'; devCode: string }
  | { ok: false; reason: 'rate_limited' | 'sms_failed' };

export async function sendOtp(subject: string, phone: string | null): Promise<SendResult> {
  console.error(`[otp] sendOtp called for subject: ${subject}, phone: ${phone}, verifyConfigured: ${verifyConfigured()}, OTP_DEV_MODE: ${OTP_DEV_MODE}`);
  
  // Dev mode: always return dev code, never attempt real SMS
  if (OTP_DEV_MODE) {
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    console.error(`[otp] DEV MODE - dev code for ${subject}: ${code}`);
    return { ok: true, channel: 'dev', devCode: code };
  }
  
  // Production mode: attempt real SMS via Twilio Verify
  if (verifyConfigured() && phone) {
    try {
      // Ensure phone is in E.164 format (starts with +)
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      console.error(`[otp] attempting Verify API send to formatted phone: ${formattedPhone}`);
      
      const result = await createVerification(formattedPhone, 'sms');
      console.error(`[otp] createVerification result:`, result);
      if (result.success) {
        console.error(`[otp] SMS sent successfully via Twilio Verify`);
        return { ok: true, channel: 'sms' };
      } else {
        console.error(`[otp] verification creation failed:`, result.error);
        // Check if it's a rate limit error
        if (result.error?.includes('rate limit') || result.error?.includes('too many')) {
          return { ok: false, reason: 'rate_limited' };
        }
        return { ok: false, reason: 'sms_failed' };
      }
    } catch (e) {
      console.error(`[otp] sms send failed with exception:`, e);
      return { ok: false, reason: 'sms_failed' };
    }
  }

  // Fallback if Twilio not configured
  console.error(`[otp] Twilio not configured, using dev code fallback`);
  const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return { ok: true, channel: 'dev', devCode: code };
}

export type VerifyResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts';

export async function verifyOtp(subject: string, code: string, phone: string | null): Promise<VerifyResult> {
  console.error(`[otp] verifyOtp called for subject: ${subject}, phone: ${phone}, OTP_DEV_MODE: ${OTP_DEV_MODE}`);
  
  // Dev mode: accept any 6-digit code
  if (OTP_DEV_MODE) {
    if (code.length === 6 && /^\d+$/.test(code)) {
      console.error(`[otp] DEV MODE - code accepted`);
      return 'ok';
    }
    console.error(`[otp] DEV MODE - invalid code format`);
    return 'invalid';
  }
  
  // Production mode: use Twilio Verify
  if (verifyConfigured() && phone) {
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      const result = await checkVerification(formattedPhone, code);
      console.error(`[otp] checkVerification result:`, result);
      
      if (result.success) {
        return 'ok';
      } else {
        // Map Twilio error codes to our results
        if (result.error === 'max_attempts_reached') {
          return 'too_many_attempts';
        }
        if (result.error === 'expired') {
          return 'expired';
        }
        return 'invalid';
      }
    } catch (e) {
      console.error(`[otp] verification check failed with exception:`, e);
      return 'invalid';
    }
  }

  // Fallback if Twilio not configured
  console.error(`[otp] Twilio not configured, using fallback validation`);
  if (code.length === 6 && /^\d+$/.test(code)) {
    return 'ok';
  }
  return 'invalid';
}
