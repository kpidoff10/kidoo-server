-- Ajouter le champ timezoneOffset à la table users
ALTER TABLE "users" ADD COLUMN "timezoneOffset" INTEGER NOT NULL DEFAULT 0;
