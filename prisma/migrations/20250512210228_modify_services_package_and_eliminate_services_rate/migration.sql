/*
  Warnings:

  - You are about to drop the column `followUpSessionId` on the `ConsultingSession` table. All the data in the column will be lost.
  - You are about to drop the column `chatRate` on the `Provider` table. All the data in the column will be lost.
  - You are about to drop the column `meetRate` on the `Provider` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,providerId,packageId]` on the table `UserProviderPackage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `packageId` to the `UserProviderPackage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ConsultingSession" DROP CONSTRAINT "ConsultingSession_followUpSessionId_fkey";

-- DropIndex
DROP INDEX "UserProviderPackage_userId_providerId_key";

-- AlterTable
ALTER TABLE "ConsultingSession" DROP COLUMN "followUpSessionId",
ADD COLUMN     "packageId" TEXT;

-- AlterTable
ALTER TABLE "Provider" DROP COLUMN "chatRate",
DROP COLUMN "meetRate";

-- AlterTable
ALTER TABLE "UserProviderPackage" ADD COLUMN     "packageId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProviderPackage" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "service" "Service" NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ProviderPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProviderPackage_userId_providerId_packageId_key" ON "UserProviderPackage"("userId", "providerId", "packageId");

-- AddForeignKey
ALTER TABLE "ProviderPackage" ADD CONSTRAINT "ProviderPackage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProviderPackage" ADD CONSTRAINT "UserProviderPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ProviderPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultingSession" ADD CONSTRAINT "ConsultingSession_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "UserProviderPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
