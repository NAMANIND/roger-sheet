import { Organization, Plan } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';

export const SYSTEM_ORG_SLUG = '__system__';

export type OrganizationContext = Organization & {
  plan: Plan;
};

let cachedSystemOrg: OrganizationContext | null = null;

/** @deprecated Internal sync only — user-facing code uses getActiveOrganization */
export async function getDefaultOrganization(): Promise<OrganizationContext> {
  if (cachedSystemOrg) return cachedSystemOrg;

  const org = await prisma.organization.findFirst({
    where: { isSystem: true, isActive: true },
    include: { plan: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!org) {
    throw new Error(
      'System organization not found. Run: npx prisma migrate deploy && npx prisma db seed'
    );
  }

  cachedSystemOrg = org;
  return org;
}

export async function getActiveOrganization(): Promise<OrganizationContext | null> {
  const session = await getSession();
  if (!session) return null;
  return session.organization;
}

export async function requireActiveOrganization(): Promise<OrganizationContext> {
  const org = await getActiveOrganization();
  if (!org) {
    throw new Error('UNAUTHORIZED');
  }
  return org;
}

/** Organizations with an active execution backend — used by internal sync workers. */
export async function listSyncOrganizations(): Promise<OrganizationContext[]> {
  const rows = await prisma.organization.findMany({
    where: {
      isActive: true,
      isSystem: false,
      executionBackend: { isActive: true },
    },
    include: { plan: true },
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length > 0) return rows;

  const fallback = await getDefaultOrganization();
  return [fallback];
}

export function clearOrganizationCache() {
  cachedSystemOrg = null;
}
