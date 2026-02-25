-- AlterTable: add frameIndex with default 0
ALTER TABLE "clip_face_regions" ADD COLUMN "frameIndex" INTEGER NOT NULL DEFAULT 0;

-- Drop old unique index
DROP INDEX "clip_face_regions_clipId_regionKey_key";

-- Create new unique index
CREATE UNIQUE INDEX "clip_face_regions_clipId_regionKey_frameIndex_key" ON "clip_face_regions"("clipId", "regionKey", "frameIndex");
