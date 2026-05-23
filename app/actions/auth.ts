'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createAndSendOtp, verifyOtp } from '@/lib/auth/otp';
import { createUserWorkspace } from '@/lib/auth/onboarding';
import {
  clearOnboardingCookie,
  clearSessionCookie,
  createSession,
  destroySession,
  readOnboardingUserId,
  setOnboardingCookie,
} from '@/lib/auth/session';
import type { ApiResponse } from '@/types/job';
import { fail, ok } from '@/lib/services/errors';

export type AuthStepResult =
  | { step: 'otp'; email: string }
  | { step: 'profile' }
  | { step: 'done' };

export async function sendLoginOtp(
  email: string
): Promise<ApiResponse<{ email: string }>> {
  const result = await createAndSendOtp(email);
  if (!result.ok) return fail(result.error);
  return ok({ email: email.trim().toLowerCase() }, 'Code sent');
}

export async function verifyLoginOtp(
  email: string,
  code: string
): Promise<ApiResponse<AuthStepResult>> {
  const verified = await verifyOtp(email, code);
  if (!verified.ok) return fail(verified.error);

  const normalized = verified.email;

  let user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalized,
        emailVerifiedAt: new Date(),
      },
    });
  } else if (!user.emailVerifiedAt) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.id,
      organization: { isSystem: false, isActive: true },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (membership) {
    await createSession(user.id, membership.organizationId);
    await clearOnboardingCookie();
    return ok({ step: 'done' });
  }

  await setOnboardingCookie(user.id);
  await clearSessionCookie();
  return ok({ step: 'profile' });
}

export async function completeOnboarding(input: {
  name: string;
  workspaceName: string;
}): Promise<ApiResponse<AuthStepResult>> {
  const userId = await readOnboardingUserId();
  if (!userId) {
    return fail('Session expired. Sign in again.');
  }

  const name = input.name.trim();
  const workspaceName = input.workspaceName.trim();

  if (name.length < 2) return fail('Enter your name');
  if (workspaceName.length < 2) return fail('Enter a workspace name');

  const existing = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organization: { isSystem: false },
    },
  });
  if (existing) {
    await createSession(userId, existing.organizationId);
    await clearOnboardingCookie();
    return ok({ step: 'done' });
  }

  const { organizationId } = await createUserWorkspace({
    userId,
    name,
    workspaceName,
  });

  await createSession(userId, organizationId);
  await clearOnboardingCookie();
  return ok({ step: 'done' });
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect('/login');
}
