-- DropIndex (IF EXISTS pour idempotence : shadow DB après 00334, prod déjà appliquée)
DROP INDEX IF EXISTS "emotion_videos_sourceClipId_emotionId_variant_key";

-- DropIndex
DROP INDEX IF EXISTS "emotion_videos_trigger_variant_idx";

-- AlterTable
ALTER TABLE "emotion_videos" DROP COLUMN IF EXISTS "trigger", DROP COLUMN IF EXISTS "variant";

-- CreateIndex (IF NOT EXISTS pour réapplication sans erreur)
CREATE UNIQUE INDEX IF NOT EXISTS "emotion_videos_sourceClipId_emotionId_key" ON "emotion_videos"("sourceClipId", "emotionId");
