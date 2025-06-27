-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('GLOBAL', 'PRIVATE');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "fromUsername" TEXT,
ADD COLUMN     "messageType" "MessageType" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "toUsername" TEXT,
ALTER COLUMN "username" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "messages_fromUsername_toUsername_idx" ON "messages"("fromUsername", "toUsername");

-- CreateIndex
CREATE INDEX "messages_messageType_idx" ON "messages"("messageType");
