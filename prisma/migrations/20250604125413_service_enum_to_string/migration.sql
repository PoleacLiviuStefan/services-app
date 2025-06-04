/*
  Warnings:

  - Changed the type of `service` on the `ProviderPackage` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "ProviderPackage"
  ALTER COLUMN "service" DROP DEFAULT,
  ALTER COLUMN "service" TYPE text USING ("service"::text);