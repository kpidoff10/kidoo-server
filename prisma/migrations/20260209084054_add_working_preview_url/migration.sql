/*
  Warnings:

  - You are about to drop the column `trimmedPreviewUrl` on the `clips` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clips" DROP COLUMN "trimmedPreviewUrl",
ADD COLUMN     "workingPreviewUrl" TEXT;
