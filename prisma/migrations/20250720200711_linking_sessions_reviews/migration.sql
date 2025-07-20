/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Review_sessionId_key" ON "Review"("sessionId");

-- CreateIndex
CREATE INDEX "Review_fromUserId_providerId_idx" ON "Review"("fromUserId", "providerId");

-- CreateIndex
CREATE INDEX "Review_providerId_rating_idx" ON "Review"("providerId", "rating");

-- CreateIndex
CREATE INDEX "Review_sessionId_idx" ON "Review"("sessionId");

-- CreateIndex
CREATE INDEX "Review_date_idx" ON "Review"("date");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConsultingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
