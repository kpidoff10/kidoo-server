-- Remplacer timezoneOffset par timezoneId (IANA timezone)
ALTER TABLE "users" DROP COLUMN IF EXISTS "timezoneOffset";
ALTER TABLE "users" ADD COLUMN "timezoneId" TEXT NOT NULL DEFAULT 'UTC';
