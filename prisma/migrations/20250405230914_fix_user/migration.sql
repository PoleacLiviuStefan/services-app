/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Tool` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Service" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "Tool" DROP COLUMN "createdAt";
