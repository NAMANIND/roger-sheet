import { cookies, headers } from 'next/headers';
import type { Organization, Plan, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  ONBOARDING_COOKIE,
  ONBOARDING_MAX_AGE_SEC,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from '@/lib/auth/constants';
import {
  generateToken,
  getAuthSecret,
  hashSecret,
  signPayload,
  verifySignedPayload,
} from '@/lib/auth/crypto';

export type SessionUser = Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>;

export type AuthContext = {
  sessionId: string;
  user: SessionUser;
  activeOrganizationId: string;
  organization: Organization & { plan: Plan };
};

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE_SEC));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function setOnboardingCookie(userId: string): Promise<void> {
  const secret = getAuthSecret();
  const expiresAt = Date.now() + ONBOARDING_MAX_AGE_SEC * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = signPayload(payload, secret);
  const value = `${payload}.${signature}`;

  const store = await cookies();
  store.set(ONBOARDING_COOKIE, value, cookieOptions(ONBOARDING_MAX_AGE_SEC));
}

export async function readOnboardingUserId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(ONBOARDING_COOKIE)?.value;
  if (!value) return null;

  const parts = value.split('.');
  if (parts.length !== 3) return null;

  const [userId, expiresRaw, signature] = parts;
  const expiresAt = Number(expiresRaw);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return null;
  }

  const payload = `${userId}.${expiresRaw}`;
  if (!verifySignedPayload(payload, signature, getAuthSecret())) {
    return null;
  }

  return userId;
}

export async function clearOnboardingCookie(): Promise<void> {
  const store = await cookies();
  store.delete(ONBOARDING_COOKIE);
}

async function readRequestMeta(): Promise<{ userAgent?: string; ipAddress?: string }> {
  const h = await headers();
  return {
    userAgent: h.get('user-agent') ?? undefined,
    ipAddress:
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      undefined,
  };
}

export async function createSession(
  userId: string,
  activeOrganizationId: string
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashSecret(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  const meta = await readRequestMeta();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      activeOrganizationId,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  await setSessionCookie(token);
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashSecret(token) },
    });
  }
  store.delete(SESSION_COOKIE);
  store.delete(ONBOARDING_COOKIE);
}

export async function getSession(): Promise<AuthContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: {
      user: {
        select: { id: true, email: true, name: true, avatarUrl: true, isActive: true },
      },
    },
  });

  if (!session || !session.user.isActive || session.expiresAt.getTime() < Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  if (!session.activeOrganizationId) return null;

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: session.activeOrganizationId,
        userId: session.userId,
      },
    },
    include: {
      organization: {
        include: { plan: true },
      },
    },
  });

  if (!membership?.organization.isActive) return null;

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    },
    activeOrganizationId: membership.organization.id,
    organization: membership.organization,
  };
}

export function hasSessionCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => {
    const [name] = part.trim().split('=');
    return name === SESSION_COOKIE;
  });
}
