import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

/** Recreate client if dev HMR kept a pre-migration singleton (missing new models). */
function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && 'emailOtp' in cached && 'session' in cached) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
