/*
  Warnings:

  - You are about to drop the column `specialityId` on the `ConsultingSession` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ConsultingSession" DROP CONSTRAINT "ConsultingSession_specialityId_fkey";

-- AlterTable
ALTER TABLE "ConsultingSession" DROP COLUMN "specialityId";
