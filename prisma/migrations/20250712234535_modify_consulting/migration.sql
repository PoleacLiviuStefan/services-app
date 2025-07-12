-- AlterTable
ALTER TABLE "ConsultingSession" ADD COLUMN     "endedBy" TEXT,
ADD COLUMN     "hasRecording" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordingDuration" INTEGER,
ADD COLUMN     "recordingFileSize" BIGINT,
ADD COLUMN     "recordingStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordingStartedAt" TIMESTAMP(3),
ADD COLUMN     "recordingStatus" TEXT,
ADD COLUMN     "recordingStoppedAt" TIMESTAMP(3);
