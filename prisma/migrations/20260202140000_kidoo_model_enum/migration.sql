-- CreateEnum
CREATE TYPE "KidooModel" AS ENUM ('basic', 'dream');

-- Migrer les valeurs existantes: classic ou autres -> basic
UPDATE "kidoos" SET model = 'basic' WHERE model IS NULL OR model NOT IN ('basic', 'dream');

-- AlterTable kidoos: passer model en enum (valeurs déjà migrées en basic/dream ci-dessus)
ALTER TABLE "kidoos" ALTER COLUMN "model" DROP DEFAULT;
ALTER TABLE "kidoos" ALTER COLUMN "model" TYPE "KidooModel" USING "model"::"KidooModel";
ALTER TABLE "kidoos" ALTER COLUMN "model" SET DEFAULT 'basic';

-- AlterTable firmwares: passer model en enum
ALTER TABLE "firmwares" ALTER COLUMN "model" TYPE "KidooModel" USING "model"::"KidooModel";
