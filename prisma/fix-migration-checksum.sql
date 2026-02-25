-- À exécuter une seule fois pour corriger l'erreur
-- "The migration 20260205130000_clip_face_region_frame_index was modified after it was applied"
--
-- 1. Exécute ce fichier dans le SQL Editor Neon (ou psql) connecté à ta base.
-- 2. Puis en terminal : npx prisma migrate resolve --applied 20260205130000_clip_face_region_frame_index

DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260205130000_clip_face_region_frame_index';
