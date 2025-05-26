/*
  Warnings:

  - You are about to drop the column `price` on the `ConsultingSession` table. All the data in the column will be lost.
  - You are about to drop the column `readingId` on the `Provider` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Reading` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Speciality` table. All the data in the column will be lost.
  - You are about to drop the column `providerId` on the `Tool` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GroupUsers" DROP CONSTRAINT "GroupUsers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Reading" DROP CONSTRAINT "Reading_providerId_fkey";

-- DropForeignKey
ALTER TABLE "Speciality" DROP CONSTRAINT "Speciality_providerId_fkey";

-- DropForeignKey
ALTER TABLE "Tool" DROP CONSTRAINT "Tool_providerId_fkey";

-- DropIndex
DROP INDEX "Reading_providerId_key";

-- AlterTable
ALTER TABLE "ConsultingSession" DROP COLUMN "price",
ADD COLUMN     "totalPrice" INTEGER;

-- AlterTable
ALTER TABLE "Provider" DROP COLUMN "readingId",
ADD COLUMN     "chatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "meetRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Reading" DROP COLUMN "providerId";

-- AlterTable
ALTER TABLE "Speciality" DROP COLUMN "providerId";

-- AlterTable
ALTER TABLE "Tool" DROP COLUMN "providerId";

-- CreateTable
CREATE TABLE "_ProviderReadings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProviderReadings_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProviderSpecialities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProviderSpecialities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProviderTools" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProviderTools_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProviderReadings_B_index" ON "_ProviderReadings"("B");

-- CreateIndex
CREATE INDEX "_ProviderSpecialities_B_index" ON "_ProviderSpecialities"("B");

-- CreateIndex
CREATE INDEX "_ProviderTools_B_index" ON "_ProviderTools"("B");

-- AddForeignKey
ALTER TABLE "GroupUsers" ADD CONSTRAINT "GroupUsers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderReadings" ADD CONSTRAINT "_ProviderReadings_A_fkey" FOREIGN KEY ("A") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderReadings" ADD CONSTRAINT "_ProviderReadings_B_fkey" FOREIGN KEY ("B") REFERENCES "Reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderSpecialities" ADD CONSTRAINT "_ProviderSpecialities_A_fkey" FOREIGN KEY ("A") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderSpecialities" ADD CONSTRAINT "_ProviderSpecialities_B_fkey" FOREIGN KEY ("B") REFERENCES "Speciality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderTools" ADD CONSTRAINT "_ProviderTools_A_fkey" FOREIGN KEY ("A") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProviderTools" ADD CONSTRAINT "_ProviderTools_B_fkey" FOREIGN KEY ("B") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
