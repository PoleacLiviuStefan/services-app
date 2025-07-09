/*
  Warnings:

  - A unique constraint covering the columns `[dailyRoomName]` on the table `ConsultingSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- DropIndex
DROP INDEX "ConsultingSession_zoomSessionName_key";

-- AlterTable
ALTER TABLE "ConsultingSession" ADD COLUMN     "actualDuration" INTEGER,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dailyCreatedAt" TIMESTAMP(3),
ADD COLUMN     "dailyDomainName" TEXT,
ADD COLUMN     "dailyRoomConfig" JSONB,
ADD COLUMN     "dailyRoomId" TEXT,
ADD COLUMN     "dailyRoomName" TEXT,
ADD COLUMN     "dailyRoomUrl" TEXT,
ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "leftAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "participantCount" INTEGER DEFAULT 0,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "recordingUrl" TEXT,
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "zoomCreatedAt" DROP NOT NULL,
ALTER COLUMN "zoomCreatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "ConsultingSession_dailyRoomName_key" ON "ConsultingSession"("dailyRoomName");

-- CreateIndex
CREATE INDEX "ConsultingSession_status_idx" ON "ConsultingSession"("status");

-- CreateIndex
CREATE INDEX "ConsultingSession_startDate_idx" ON "ConsultingSession"("startDate");

-- CreateIndex
CREATE INDEX "ConsultingSession_providerId_clientId_idx" ON "ConsultingSession"("providerId", "clientId");

-- CreateIndex
CREATE INDEX "ConsultingSession_dailyRoomName_idx" ON "ConsultingSession"("dailyRoomName");
