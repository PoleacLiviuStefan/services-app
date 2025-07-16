-- AlterTable
ALTER TABLE "ConsultingSession" ADD COLUMN     "packageSessionNumber" INTEGER,
ADD COLUMN     "wasPackageSession" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ConsultingSession_packageId_status_idx" ON "ConsultingSession"("packageId", "status");

-- CreateIndex
CREATE INDEX "ConsultingSession_wasPackageSession_idx" ON "ConsultingSession"("wasPackageSession");

-- CreateIndex
CREATE INDEX "ConsultingSession_scheduledAt_idx" ON "ConsultingSession"("scheduledAt");

-- CreateIndex
CREATE INDEX "UserProviderPackage_userId_providerId_usedSessions_expiresA_idx" ON "UserProviderPackage"("userId", "providerId", "usedSessions", "expiresAt");

-- CreateIndex
CREATE INDEX "UserProviderPackage_usedSessions_totalSessions_idx" ON "UserProviderPackage"("usedSessions", "totalSessions");

-- CreateIndex
CREATE INDEX "UserProviderPackage_expiresAt_idx" ON "UserProviderPackage"("expiresAt");
