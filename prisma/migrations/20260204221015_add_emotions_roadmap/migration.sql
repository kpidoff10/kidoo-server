-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('RFID', 'TEMP', 'IMU', 'TOUCH', 'POWER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventKey" AS ENUM ('TAG_PRESENT', 'TAG_ABSENT', 'TEMP_READING', 'TEMP_HOT', 'TEMP_COLD', 'IMU_SHAKE', 'IMU_TILT', 'TOUCH_TAP', 'TOUCH_LONG', 'CHARGING_STARTED', 'CHARGING_STOPPED', 'SLEEP_ENTER', 'SLEEP_EXIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ClipStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'FAILED', 'DISABLED');

-- CreateEnum
CREATE TYPE "EmotionDeviceMode" AS ENUM ('NORMAL', 'CHARGING', 'SLEEP');

-- AlterTable
ALTER TABLE "characters" ADD COLUMN     "stylePrompt" TEXT;

-- CreateTable
CREATE TABLE "emotions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clips" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "emotionId" TEXT NOT NULL,
    "status" "ClipStatus" NOT NULL DEFAULT 'DRAFT',
    "fileUrl" TEXT,
    "sha256" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "fps" INTEGER,
    "frames" INTEGER,
    "durationS" DOUBLE PRECISION,
    "prompt" TEXT,
    "modelName" TEXT,
    "previewUrl" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emotion_devices" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "pubnubChannel" TEXT,
    "mode" "EmotionDeviceMode" NOT NULL DEFAULT 'NORMAL',
    "isCharging" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emotion_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_clip_caches" (
    "deviceId" TEXT NOT NULL,
    "emotionId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "clipId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayedAt" TIMESTAMP(3),

    CONSTRAINT "device_clip_caches_pkey" PRIMARY KEY ("deviceId","emotionId","slot")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "characterId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "cooldownMs" INTEGER NOT NULL DEFAULT 0,
    "eventType" "EventType" NOT NULL,
    "eventKey" "EventKey" NOT NULL,
    "conditions" JSONB,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "object_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "object_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfid_objects" (
    "uid" TEXT NOT NULL,
    "objectTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "emotions_key_key" ON "emotions"("key");

-- CreateIndex
CREATE INDEX "clips_characterId_idx" ON "clips"("characterId");

-- CreateIndex
CREATE INDEX "clips_emotionId_idx" ON "clips"("emotionId");

-- CreateIndex
CREATE INDEX "clips_characterId_emotionId_idx" ON "clips"("characterId", "emotionId");

-- CreateIndex
CREATE INDEX "clips_status_idx" ON "clips"("status");

-- CreateIndex
CREATE INDEX "emotion_devices_characterId_idx" ON "emotion_devices"("characterId");

-- CreateIndex
CREATE INDEX "device_clip_caches_deviceId_idx" ON "device_clip_caches"("deviceId");

-- CreateIndex
CREATE INDEX "device_clip_caches_emotionId_idx" ON "device_clip_caches"("emotionId");

-- CreateIndex
CREATE INDEX "device_clip_caches_clipId_idx" ON "device_clip_caches"("clipId");

-- CreateIndex
CREATE INDEX "rules_characterId_idx" ON "rules"("characterId");

-- CreateIndex
CREATE INDEX "rules_enabled_eventType_eventKey_idx" ON "rules"("enabled", "eventType", "eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "object_types_key_key" ON "object_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "rfid_objects_uid_key" ON "rfid_objects"("uid");

-- CreateIndex
CREATE INDEX "rfid_objects_objectTypeId_idx" ON "rfid_objects"("objectTypeId");

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clips" ADD CONSTRAINT "clips_emotionId_fkey" FOREIGN KEY ("emotionId") REFERENCES "emotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emotion_devices" ADD CONSTRAINT "emotion_devices_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_clip_caches" ADD CONSTRAINT "device_clip_caches_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "emotion_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_clip_caches" ADD CONSTRAINT "device_clip_caches_emotionId_fkey" FOREIGN KEY ("emotionId") REFERENCES "emotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_clip_caches" ADD CONSTRAINT "device_clip_caches_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfid_objects" ADD CONSTRAINT "rfid_objects_objectTypeId_fkey" FOREIGN KEY ("objectTypeId") REFERENCES "object_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
