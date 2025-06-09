/*
  Warnings:

  - A unique constraint covering the columns `[calendlyEventTypeUri]` on the table `ProviderPackage` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ProviderPackage" ADD COLUMN     "calendlyEventTypeUri" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProviderPackage_calendlyEventTypeUri_key" ON "ProviderPackage"("calendlyEventTypeUri");
