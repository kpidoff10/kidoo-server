-- AlterTable
ALTER TABLE "clips" ADD COLUMN "variant" INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX "emotion_videos_sourceClipId_emotionId_key";

-- AlterTable
ALTER TABLE "emotion_videos" ADD COLUMN "trigger" TEXT DEFAULT 'manual',
ADD COLUMN "variant" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "emotion_videos_sourceClipId_emotionId_variant_key" ON "emotion_videos"("sourceClipId", "emotionId", "variant");

-- CreateIndex
CREATE INDEX "emotion_videos_trigger_variant_idx" ON "emotion_videos"("trigger", "variant");
