-- CreateTable
CREATE TABLE "clip_artifacts" (
    "id" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "frameIndex" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,
    "cornerStyle" "CornerStyle" NOT NULL DEFAULT 'ROUNDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clip_artifacts_clipId_idx" ON "clip_artifacts"("clipId");

-- AddForeignKey
ALTER TABLE "clip_artifacts" ADD CONSTRAINT "clip_artifacts_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
