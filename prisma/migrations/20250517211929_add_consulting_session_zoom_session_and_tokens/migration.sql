/*
  Warnings:

  - A unique constraint covering the columns `[zoomSessionName]` on the table `ConsultingSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ConsultingSession" ADD COLUMN     "zoomCreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "zoomSessionName" TEXT,
ADD COLUMN     "zoomTokens" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "ConsultingSession_zoomSessionName_key" ON "ConsultingSession"("zoomSessionName");
