/*
  Warnings:

  - You are about to drop the column `frames` on the `emotion_videos` table. All the data in the column will be lost.
  - You are about to drop the column `loopEndFrame` on the `emotion_videos` table. All the data in the column will be lost.
  - You are about to drop the column `loopStartFrame` on the `emotion_videos` table. All the data in the column will be lost.
  - You are about to drop the column `timeline` on the `emotion_videos` table. All the data in the column will be lost.
  - Added the required column `exitTimeline` to the `emotion_videos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `introTimeline` to the `emotion_videos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `loopTimeline` to the `emotion_videos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "emotion_videos" DROP COLUMN "frames",
DROP COLUMN "loopEndFrame",
DROP COLUMN "loopStartFrame",
DROP COLUMN "timeline",
ADD COLUMN     "exitTimeline" JSONB NOT NULL,
ADD COLUMN     "introTimeline" JSONB NOT NULL,
ADD COLUMN     "loopTimeline" JSONB NOT NULL,
ADD COLUMN     "totalFrames" INTEGER;
