/*
  Warnings:

  - Added the required column `date` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `providerId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rating` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "providerId" TEXT NOT NULL,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
