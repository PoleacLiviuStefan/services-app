-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "calendlyAccessToken" TEXT,
ADD COLUMN     "calendlyExpiresAt" TIMESTAMP(3),
ADD COLUMN     "calendlyRefreshToken" TEXT;
