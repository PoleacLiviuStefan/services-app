-- AlterTable
ALTER TABLE "ConsultingSession" ADD COLUMN     "followUpSessionId" TEXT;

-- AddForeignKey
ALTER TABLE "ConsultingSession" ADD CONSTRAINT "ConsultingSession_followUpSessionId_fkey" FOREIGN KEY ("followUpSessionId") REFERENCES "ConsultingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
