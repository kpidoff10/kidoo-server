-- CreateEnum
CREATE TYPE "TagType" AS ENUM ('MUSIC', 'STORY', 'SOUND');

-- AlterTable
ALTER TABLE "tags" ADD COLUMN "type" "TagType";

-- CreateIndex
CREATE INDEX "tags_type_idx" ON "tags"("type");
