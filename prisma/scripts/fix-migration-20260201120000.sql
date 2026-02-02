-- Supprime l'entrée de la migration modifiée pour que migrate dev puisse la réappliquer (no-op)
-- et enregistrer le nouveau checksum. À exécuter une seule fois.
DELETE FROM _prisma_migrations WHERE migration_name = '20260201120000_add_firmware';
