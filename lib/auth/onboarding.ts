import { OrganizationRole, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

export async function createUserWorkspace(input: {
  userId: string;
  name: string;
  workspaceName: string;
}): Promise<{ organizationId: string }> {
  const freePlan = await prisma.plan.findFirst({
    where: { slug: 'free', isActive: true },
  });
  if (!freePlan) {
    throw new Error('Free plan not found. Run db:seed.');
  }

  const baseSlug = slugify(input.workspaceName) || 'workspace';
  let slug = baseSlug;
  let attempt = 0;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const org = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        slug,
        name: input.workspaceName.trim(),
        planId: freePlan.id,
        metadata: { createdBy: input.userId },
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: input.userId,
        role: OrganizationRole.owner,
      },
    });

    await tx.organizationSubscription.create({
      data: {
        organizationId: organization.id,
        planId: freePlan.id,
        status: SubscriptionStatus.active,
        metadata: { source: 'signup' },
      },
    });

    await tx.executionBackend.create({
      data: {
        organizationId: organization.id,
        type: 'apps_script',
        isActive: true,
        webAppUrl: process.env.APPS_SCRIPT_WEB_APP_URL ?? null,
        metadata: { provider: 'google_apps_script' },
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: { name: input.name.trim() },
    });

    return organization;
  });

  return { organizationId: org.id };
}
