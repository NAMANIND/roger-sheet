import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const PLANS = [
  {
    slug: 'free',
    name: 'Free',
    description: 'For personal projects and evaluation',
    sortOrder: 0,
    maxPipelines: 2,
    maxActions: 10,
    maxActiveJobs: 20,
    maxSchedules: 10,
    maxMembers: 3,
    retentionDays: 7,
    metadata: { tier: 'free', pingRunsPerMonth: 2000, fullRunsPerMonth: 50 },
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'For teams running production workloads',
    sortOrder: 1,
    maxPipelines: 10,
    maxActions: 50,
    maxActiveJobs: 100,
    maxSchedules: 100,
    maxMembers: 5,
    retentionDays: 90,
    metadata: { tier: 'pro', pingRunsPerMonth: 50000, fullRunsPerMonth: 2000 },
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    description: 'Custom limits and dedicated support',
    sortOrder: 2,
    maxPipelines: null,
    maxActions: null,
    maxActiveJobs: null,
    maxSchedules: null,
    maxMembers: null,
    retentionDays: 365,
    metadata: { tier: 'enterprise' },
  },
] as const;

const SYSTEM_ORG_SLUG = '__system__';
const SYSTEM_USER_EMAIL = 'system@dispatch.internal';

async function main() {
  console.log('Seeding plans…');
  const plansBySlug: Record<string, string> = {};

  for (const plan of PLANS) {
    const row = await prisma.plan.upsert({
      where: { slug: plan.slug },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        sortOrder: plan.sortOrder,
        maxPipelines: plan.maxPipelines,
        maxActions: plan.maxActions,
        maxActiveJobs: plan.maxActiveJobs,
        maxSchedules: plan.maxSchedules,
        maxMembers: plan.maxMembers,
        retentionDays: plan.retentionDays,
        metadata: plan.metadata,
      },
    });
    plansBySlug[plan.slug] = row.id;
  }

  console.log('Seeding system organization…');
  const freePlanId = plansBySlug.free;

  const organization = await prisma.organization.upsert({
    where: { slug: SYSTEM_ORG_SLUG },
    create: {
      slug: SYSTEM_ORG_SLUG,
      name: 'System',
      isSystem: true,
      isActive: true,
      planId: freePlanId,
      metadata: {
        hidden: true,
        phase: 'A',
        note: 'Default workspace until multi-tenant auth ships',
      },
    },
    update: {
      isSystem: true,
      planId: freePlanId,
    },
  });

  const existingSub = await prisma.organizationSubscription.findFirst({
    where: { organizationId: organization.id },
  });
  if (!existingSub) {
    await prisma.organizationSubscription.create({
      data: {
        organizationId: organization.id,
        planId: freePlanId,
        status: SubscriptionStatus.active,
        metadata: { source: 'seed' },
      },
    });
  }

  await prisma.executionBackend.upsert({
    where: { organizationId: organization.id },
    create: {
      organizationId: organization.id,
      type: 'apps_script',
      isActive: true,
      webAppUrl: process.env.APPS_SCRIPT_WEB_APP_URL ?? null,
      metadata: { provider: 'google_apps_script' },
    },
    update: {
      webAppUrl: process.env.APPS_SCRIPT_WEB_APP_URL ?? null,
    },
  });

  console.log('Seeding system user…');
  const user = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    create: {
      email: SYSTEM_USER_EMAIL,
      name: 'System',
      metadata: { hidden: true },
    },
    update: {},
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: 'owner',
      metadata: { hidden: true },
    },
    update: { role: 'owner' },
  });

  console.log('Seed complete.');
  console.log(`  Organization: ${organization.slug} (${organization.id})`);
  console.log(`  Plan: free`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
