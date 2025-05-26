-- CreateEnum
CREATE TYPE "Service" AS ENUM ('CHAT', 'MEET');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "service" "Service" NOT NULL DEFAULT 'MEET';
