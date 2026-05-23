import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function generateOtpCode(length: number): string {
  const max = 10 ** length;
  const num = randomBytes(4).readUInt32BE(0) % max;
  return String(num).padStart(length, '0');
}

export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function verifySignedPayload(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signPayload(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function getAuthSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
}
