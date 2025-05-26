/*
  Warnings:

  - A unique constraint covering the columns `[calendlyCalendarUri]` on the table `Provider` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "calendlyCalendarUri" TEXT;

-- CreateTable
CREATE TABLE "CalendlyWebhookSubscription" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "calendarUri" TEXT NOT NULL,
    "events" TEXT[],
    "scope" TEXT NOT NULL,
    "callbackUrl" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendlyWebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendlyWebhookSubscription_subscriptionId_key" ON "CalendlyWebhookSubscription"("subscriptionId");

-- CreateIndex
CREATE INDEX "CalendlyWebhookSubscription_calendarUri_idx" ON "CalendlyWebhookSubscription"("calendarUri");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_calendlyCalendarUri_key" ON "Provider"("calendlyCalendarUri");

-- AddForeignKey
ALTER TABLE "CalendlyWebhookSubscription" ADD CONSTRAINT "CalendlyWebhookSubscription_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
