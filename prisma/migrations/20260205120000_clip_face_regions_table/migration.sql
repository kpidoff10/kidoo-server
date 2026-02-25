-- CreateEnum
CREATE TYPE "FaceRegionKey" AS ENUM ('LEFT_EYE', 'RIGHT_EYE', 'MOUTH');

-- CreateTable
CREATE TABLE "clip_face_regions" (
    "id" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "regionKey" "FaceRegionKey" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_face_regions_pkey" PRIMARY KEY ("id")
);

-- Migrate existing JSON data to clip_face_regions (leftEye)
INSERT INTO "clip_face_regions" ("id", "clipId", "regionKey", "x", "y", "w", "h", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 'LEFT_EYE',
  COALESCE((("faceRegions"->'leftEye'->>'x')::double precision), 0),
  COALESCE((("faceRegions"->'leftEye'->>'y')::double precision), 0),
  COALESCE((("faceRegions"->'leftEye'->>'w')::double precision), 0.1),
  COALESCE((("faceRegions"->'leftEye'->>'h')::double precision), 0.1),
  NOW(), NOW()
FROM "clips"
WHERE "faceRegions" IS NOT NULL AND "faceRegions"->'leftEye' IS NOT NULL;

-- rightEye
INSERT INTO "clip_face_regions" ("id", "clipId", "regionKey", "x", "y", "w", "h", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 'RIGHT_EYE',
  COALESCE((("faceRegions"->'rightEye'->>'x')::double precision), 0),
  COALESCE((("faceRegions"->'rightEye'->>'y')::double precision), 0),
  COALESCE((("faceRegions"->'rightEye'->>'w')::double precision), 0.1),
  COALESCE((("faceRegions"->'rightEye'->>'h')::double precision), 0.1),
  NOW(), NOW()
FROM "clips"
WHERE "faceRegions" IS NOT NULL AND "faceRegions"->'rightEye' IS NOT NULL;

-- mouth
INSERT INTO "clip_face_regions" ("id", "clipId", "regionKey", "x", "y", "w", "h", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 'MOUTH',
  COALESCE((("faceRegions"->'mouth'->>'x')::double precision), 0),
  COALESCE((("faceRegions"->'mouth'->>'y')::double precision), 0),
  COALESCE((("faceRegions"->'mouth'->>'w')::double precision), 0.1),
  COALESCE((("faceRegions"->'mouth'->>'h')::double precision), 0.1),
  NOW(), NOW()
FROM "clips"
WHERE "faceRegions" IS NOT NULL AND "faceRegions"->'mouth' IS NOT NULL;

-- DropColumn
ALTER TABLE "clips" DROP COLUMN "faceRegions";

-- CreateIndex
CREATE UNIQUE INDEX "clip_face_regions_clipId_regionKey_key" ON "clip_face_regions"("clipId", "regionKey");

-- CreateIndex
CREATE INDEX "clip_face_regions_clipId_idx" ON "clip_face_regions"("clipId");

-- AddForeignKey
ALTER TABLE "clip_face_regions" ADD CONSTRAINT "clip_face_regions_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
