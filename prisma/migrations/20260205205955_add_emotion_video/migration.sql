-- CreateTable
CREATE TABLE "emotion_videos" (
    "id" TEXT NOT NULL,
    "emotionId" TEXT NOT NULL,
    "sourceClipId" TEXT NOT NULL,
    "name" TEXT,
    "fps" INTEGER NOT NULL DEFAULT 10,
    "width" INTEGER NOT NULL DEFAULT 240,
    "height" INTEGER NOT NULL DEFAULT 280,
    "timeline" JSONB NOT NULL,
    "loopStartFrame" INTEGER,
    "loopEndFrame" INTEGER,
    "status" "ClipStatus" NOT NULL DEFAULT 'DRAFT',
    "binUrl" TEXT,
    "sha256" TEXT,
    "sizeBytes" INTEGER,
    "frames" INTEGER,
    "durationS" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emotion_videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "emotion_videos_emotionId_idx" ON "emotion_videos"("emotionId");

-- CreateIndex
CREATE INDEX "emotion_videos_sourceClipId_idx" ON "emotion_videos"("sourceClipId");

-- CreateIndex
CREATE INDEX "emotion_videos_status_idx" ON "emotion_videos"("status");

-- AddForeignKey
ALTER TABLE "emotion_videos" ADD CONSTRAINT "emotion_videos_emotionId_fkey" FOREIGN KEY ("emotionId") REFERENCES "emotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_videos" ADD CONSTRAINT "emotion_videos_sourceClipId_fkey" FOREIGN KEY ("sourceClipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
