-- AlterTable: Ajouter la colonne tagId (nullable temporairement)
ALTER TABLE "tags" ADD COLUMN "tagId" TEXT;

-- Remplir tagId avec l'id existant pour les donnees existantes
-- (car avant, l'id etait cense etre l'UUID ecrit sur le tag)
UPDATE "tags" SET "tagId" = "id" WHERE "tagId" IS NULL;

-- Creer l'index unique sur tagId
CREATE UNIQUE INDEX "tags_tagId_key" ON "tags"("tagId");

-- Creer l'index sur tagId
CREATE INDEX "tags_tagId_idx" ON "tags"("tagId");
