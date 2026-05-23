import { prisma } from '@/lib/prisma';
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  OTP_LENGTH,
} from '@/lib/auth/constants';
import { generateOtpCode, hashSecret } from '@/lib/auth/crypto';
import { sendLoginOtpEmail } from '@/lib/auth/mailer';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BLOCKED_EMAILS = new Set(['system@dispatch.internal']);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (BLOCKED_EMAILS.has(normalized)) return false;
  return EMAIL_RE.test(normalized);
}

export async function createAndSendOtp(
  rawEmail: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Enter a valid email address' };
  }

  const recent = await prisma.emailOtp.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (
    recent &&
    Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return { ok: false, error: 'Wait a minute before requesting another code' };
  }

  const code = generateOtpCode(OTP_LENGTH);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.emailOtp.create({
    data: {
      email,
      codeHash: hashSecret(`${email}:${code}`),
      expiresAt,
    },
  });

  try {
    await sendLoginOtpEmail(email, code);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return { ok: false, error: message };
  }

  return { ok: true };
}

export async function verifyOtp(
  rawEmail: string,
  code: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  const trimmed = code.trim();

  if (!isValidEmail(email)) {
    return { ok: false, error: 'Invalid email' };
  }
  if (!/^\d{6}$/.test(trimmed)) {
    return { ok: false, error: 'Enter the 6-digit code' };
  }

  const otp = await prisma.emailOtp.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    return { ok: false, error: 'No active code for this email. Request a new one.' };
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: 'Code expired. Request a new one.' };
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: 'Too many attempts. Request a new code.' };
  }

  const valid = otp.codeHash === hashSecret(`${email}:${trimmed}`);

  if (!valid) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: 'Incorrect code' };
  }

  await prisma.emailOtp.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, email };
}
