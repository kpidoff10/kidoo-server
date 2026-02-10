/*
  Warnings:

  - A unique constraint covering the columns `[sourceClipId,emotionId]` on the table `emotion_videos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "emotion_videos_sourceClipId_emotionId_key" ON "emotion_videos"("sourceClipId", "emotionId");
