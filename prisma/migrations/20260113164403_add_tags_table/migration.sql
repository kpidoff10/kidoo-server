-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "name" TEXT,
    "kidooId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_tagId_key" ON "tags"("tagId");

-- CreateIndex
CREATE INDEX "tags_kidooId_idx" ON "tags"("kidooId");

-- CreateIndex
CREATE INDEX "tags_userId_idx" ON "tags"("userId");

-- CreateIndex
CREATE INDEX "tags_tagId_idx" ON "tags"("tagId");

-- CreateIndex
CREATE INDEX "tags_uid_idx" ON "tags"("uid");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_kidooId_fkey" FOREIGN KEY ("kidooId") REFERENCES "kidoos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
