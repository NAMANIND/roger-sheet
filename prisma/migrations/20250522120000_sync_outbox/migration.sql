-- CreateEnum
CREATE TYPE "SyncOutboxStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "SyncOutbox" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "executorAction" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "SyncOutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncOutbox_organizationId_status_nextRetryAt_idx" ON "SyncOutbox"("organizationId", "status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "SyncOutbox_status_nextRetryAt_idx" ON "SyncOutbox"("status", "nextRetryAt");

-- AddForeignKey
ALTER TABLE "SyncOutbox" ADD CONSTRAINT "SyncOutbox_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
