/*
  Warnings:

  - You are about to drop the `_ProviderReadings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ProviderReadings" DROP CONSTRAINT "_ProviderReadings_A_fkey";

-- DropForeignKey
ALTER TABLE "_ProviderReadings" DROP CONSTRAINT "_ProviderReadings_B_fkey";

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "readingId" TEXT;

-- DropTable
DROP TABLE "_ProviderReadings";

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE SET NULL ON UPDATE CASCADE;
