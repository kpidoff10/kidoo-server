-- AlterTable
ALTER TABLE "kidoos" ADD COLUMN     "bluetoothMacAddress" TEXT,
ADD COLUMN     "brightness" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "sleepColorB" INTEGER,
ADD COLUMN     "sleepColorG" INTEGER,
ADD COLUMN     "sleepColorR" INTEGER,
ADD COLUMN     "sleepEffect" INTEGER,
ADD COLUMN     "sleepTimeout" INTEGER NOT NULL DEFAULT 30000;

-- CreateTable
CREATE TABLE "firmwares" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "firmwares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kidoo_config_basic" (
    "id" TEXT NOT NULL,
    "kidooId" TEXT NOT NULL,
    "storageTotalBytes" BIGINT,
    "storageFreeBytes" BIGINT,
    "storageUsedBytes" BIGINT,
    "storageFreePercent" INTEGER,
    "storageUsedPercent" INTEGER,
    "storageLastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kidoo_config_basic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kidoo_config_dream" (
    "id" TEXT NOT NULL,
    "kidooId" TEXT NOT NULL,
    "colorR" INTEGER,
    "colorG" INTEGER,
    "colorB" INTEGER,
    "brightness" INTEGER,
    "allNight" BOOLEAN NOT NULL DEFAULT false,
    "effect" TEXT,
    "wakeupColorR" INTEGER,
    "wakeupColorG" INTEGER,
    "wakeupColorB" INTEGER,
    "wakeupBrightness" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kidoo_config_dream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kidoo_config_dream_bedtime_schedule" (
    "id" TEXT NOT NULL,
    "kidooConfigDreamId" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kidoo_config_dream_bedtime_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kidoo_config_dream_wakeup_schedule" (
    "id" TEXT NOT NULL,
    "kidooConfigDreamId" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "hour" INTEGER NOT NULL,
    "minute" INTEGER NOT NULL,
    "activated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kidoo_config_dream_wakeup_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "firmwares_model_idx" ON "firmwares"("model");

-- CreateIndex
CREATE UNIQUE INDEX "firmwares_model_version_key" ON "firmwares"("model", "version");

-- CreateIndex
CREATE INDEX "files_tagId_idx" ON "files"("tagId");

-- CreateIndex
CREATE INDEX "files_userId_idx" ON "files"("userId");

-- CreateIndex
CREATE INDEX "files_createdAt_idx" ON "files"("createdAt");

-- CreateIndex
CREATE INDEX "files_tagId_order_idx" ON "files"("tagId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "kidoo_config_basic_kidooId_key" ON "kidoo_config_basic"("kidooId");

-- CreateIndex
CREATE INDEX "kidoo_config_basic_kidooId_idx" ON "kidoo_config_basic"("kidooId");

-- CreateIndex
CREATE UNIQUE INDEX "kidoo_config_dream_kidooId_key" ON "kidoo_config_dream"("kidooId");

-- CreateIndex
CREATE INDEX "kidoo_config_dream_kidooId_idx" ON "kidoo_config_dream"("kidooId");

-- CreateIndex
CREATE INDEX "kidoo_config_dream_bedtime_schedule_kidooConfigDreamId_idx" ON "kidoo_config_dream_bedtime_schedule"("kidooConfigDreamId");

-- CreateIndex
CREATE UNIQUE INDEX "kidoo_config_dream_bedtime_schedule_kidooConfigDreamId_week_key" ON "kidoo_config_dream_bedtime_schedule"("kidooConfigDreamId", "weekday");

-- CreateIndex
CREATE INDEX "kidoo_config_dream_wakeup_schedule_kidooConfigDreamId_idx" ON "kidoo_config_dream_wakeup_schedule"("kidooConfigDreamId");

-- CreateIndex
CREATE UNIQUE INDEX "kidoo_config_dream_wakeup_schedule_kidooConfigDreamId_weekd_key" ON "kidoo_config_dream_wakeup_schedule"("kidooConfigDreamId", "weekday");

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kidoo_config_basic" ADD CONSTRAINT "kidoo_config_basic_kidooId_fkey" FOREIGN KEY ("kidooId") REFERENCES "kidoos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kidoo_config_dream" ADD CONSTRAINT "kidoo_config_dream_kidooId_fkey" FOREIGN KEY ("kidooId") REFERENCES "kidoos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kidoo_config_dream_bedtime_schedule" ADD CONSTRAINT "kidoo_config_dream_bedtime_schedule_kidooConfigDreamId_fkey" FOREIGN KEY ("kidooConfigDreamId") REFERENCES "kidoo_config_dream"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kidoo_config_dream_wakeup_schedule" ADD CONSTRAINT "kidoo_config_dream_wakeup_schedule_kidooConfigDreamId_fkey" FOREIGN KEY ("kidooConfigDreamId") REFERENCES "kidoo_config_dream"("id") ON DELETE CASCADE ON UPDATE CASCADE;
