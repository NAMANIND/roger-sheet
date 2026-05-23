-- CreateEnum
CREATE TYPE "ExecutionMode" AS ENUM ('ping', 'full');

-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'http_ping';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "executionMode" "ExecutionMode" NOT NULL DEFAULT 'full';

-- AlterTable
ALTER TABLE "JobHistory" ADD COLUMN "executionMode" "ExecutionMode" NOT NULL DEFAULT 'full';

-- CreateIndex
CREATE INDEX "Job_organizationId_executionMode_state_idx" ON "Job"("organizationId", "executionMode", "state");
