/*
  Warnings:

  - A unique constraint covering the columns `[providerId]` on the table `Reading` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Reading_providerId_key" ON "Reading"("providerId");
