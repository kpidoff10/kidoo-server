-- CreateEnum
CREATE TYPE "CharacterSex" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "CharacterPersonality" AS ENUM ('TIMID', 'GRUMPY', 'FUNNY', 'ALWAYS_HUNGRY', 'BASIC');

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "defaultImageUrl" TEXT,
    "sex" "CharacterSex" NOT NULL,
    "personality" "CharacterPersonality" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);
