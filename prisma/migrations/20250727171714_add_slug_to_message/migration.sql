-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "fromUserSlug" TEXT,
ADD COLUMN     "toUserSlug" TEXT,
ADD COLUMN     "userSlug" TEXT;

-- CreateIndex
CREATE INDEX "messages_fromUserSlug_toUserSlug_idx" ON "messages"("fromUserSlug", "toUserSlug");

-- CreateIndex
CREATE INDEX "messages_userSlug_idx" ON "messages"("userSlug");
