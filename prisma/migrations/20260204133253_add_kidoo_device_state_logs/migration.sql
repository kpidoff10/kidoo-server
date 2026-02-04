-- CreateEnum
CREATE TYPE "DeviceStateLogState" AS ENUM ('idle', 'bedtime', 'wakeup');

-- CreateTable
CREATE TABLE "kidoo_device_state_logs" (
    "id" TEXT NOT NULL,
    "kidooId" TEXT NOT NULL,
    "state" "DeviceStateLogState" NOT NULL,
    "source" TEXT DEFAULT 'device',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kidoo_device_state_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kidoo_device_state_logs_kidooId_idx" ON "kidoo_device_state_logs"("kidooId");

-- CreateIndex
CREATE INDEX "kidoo_device_state_logs_kidooId_createdAt_idx" ON "kidoo_device_state_logs"("kidooId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "kidoo_device_state_logs" ADD CONSTRAINT "kidoo_device_state_logs_kidooId_fkey" FOREIGN KEY ("kidooId") REFERENCES "kidoos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
