-- Add wakeup auto-shutdown configuration to KidooConfigDream
ALTER TABLE "kidoo_config_dream" ADD COLUMN "wakeupAutoShutdown" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "kidoo_config_dream" ADD COLUMN "wakeupAutoShutdownMinutes" INTEGER DEFAULT 30;
