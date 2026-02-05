-- CreateEnum
CREATE TYPE "CornerStyle" AS ENUM ('ROUNDED', 'SQUARE');

-- AlterTable
ALTER TABLE "clip_face_regions" ADD COLUMN "cornerStyle" "CornerStyle" NOT NULL DEFAULT 'ROUNDED';
