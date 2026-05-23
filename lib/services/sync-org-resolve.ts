import { prisma } from '@/lib/prisma';
import { getDefaultOrganization, listSyncOrganizations } from '@/lib/organization';

/** Resolve which workspace owns a job pulled from the shared executor. */
export async function resolveJobOrganizationId(jobId: string): Promise<string> {
  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
    select: { organizationId: true },
  });
  if (existingJob) return existingJob.organizationId;

  const existingHistory = await prisma.jobHistory.findUnique({
    where: { id: jobId },
    select: { organizationId: true },
  });
  if (existingHistory) return existingHistory.organizationId;

  const orgs = await listSyncOrganizations();
  if (orgs.length === 1) return orgs[0].id;

  const fallback = await getDefaultOrganization();
  return fallback.id;
}

export async function touchSyncOrganizations(): Promise<string[]> {
  const orgs = await listSyncOrganizations();
  return orgs.map((o) => o.id);
}
