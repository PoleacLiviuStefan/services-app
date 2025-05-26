-- AlterTable
ALTER TABLE "ConsultingSession" ADD COLUMN     "accountId" INTEGER,
ADD COLUMN     "calendlyEventUri" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "ConsultingSession" ADD CONSTRAINT "ConsultingSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
