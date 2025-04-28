-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "grossVolume" INTEGER;

-- CreateTable
CREATE TABLE "consultingSession" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "specialityId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "price" INTEGER,
    "isFinished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "consultingSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "consultingSession" ADD CONSTRAINT "consultingSession_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultingSession" ADD CONSTRAINT "consultingSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultingSession" ADD CONSTRAINT "consultingSession_specialityId_fkey" FOREIGN KEY ("specialityId") REFERENCES "Speciality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
