/*
  Warnings:

  - You are about to drop the `BillingDetails` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PERS_FIZICA', 'PERS_JURIDICA');

-- DropForeignKey
ALTER TABLE "BillingDetails" DROP CONSTRAINT "BillingDetails_userId_fkey";

-- DropTable
DROP TABLE "BillingDetails";

-- CreateTable
CREATE TABLE "billing_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL DEFAULT 'PERS_JURIDICA',
    "companyName" TEXT NOT NULL,
    "cif" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "bank" TEXT,
    "iban" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_details_userId_key" ON "billing_details"("userId");

-- AddForeignKey
ALTER TABLE "billing_details" ADD CONSTRAINT "billing_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
