-- Rename resetToken to resetCode
ALTER TABLE "users" RENAME COLUMN "resetToken" TO "resetCode";

-- Rename resetTokenExpiresAt to resetCodeExpiresAt
ALTER TABLE "users" RENAME COLUMN "resetTokenExpiresAt" TO "resetCodeExpiresAt";

-- Rename the unique constraint
ALTER TABLE "users" DROP CONSTRAINT "users_resetToken_key";
ALTER TABLE "users" ADD CONSTRAINT "users_resetCode_key" UNIQUE ("resetCode");
