/*
  Warnings:

  - You are about to drop the column `tagId` on the `tags` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tags_tagId_idx";

-- DropIndex
DROP INDEX "tags_tagId_key";

-- AlterTable
ALTER TABLE "tags" DROP COLUMN "tagId";
