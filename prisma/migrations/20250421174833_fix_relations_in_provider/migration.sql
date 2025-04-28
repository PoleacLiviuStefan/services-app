/*
  Warnings:

  - You are about to drop the `consultingSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "consultingSession" DROP CONSTRAINT "consultingSession_clientId_fkey";

-- DropForeignKey
ALTER TABLE "consultingSession" DROP CONSTRAINT "consultingSession_providerId_fkey";

-- DropForeignKey
ALTER TABLE "consultingSession" DROP CONSTRAINT "consultingSession_specialityId_fkey";

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "readingId" TEXT;

-- DropTable
DROP TABLE "consultingSession";

-- CreateTable
CREATE TABLE "ConsultingSession" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "specialityId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "price" INTEGER,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConsultingSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConsultingSession" ADD CONSTRAINT "ConsultingSession_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultingSession" ADD CONSTRAINT "ConsultingSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultingSession" ADD CONSTRAINT "ConsultingSession_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "Speciality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
