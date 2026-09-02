-- ============================================================
-- Migration de Production : Séparation Ventes Comptoir et Yalidine
-- Date : 2026-09-02
-- Description : 
--   1. Création de l'ENUM TypeVente (COMPTOIR, YALIDINE)
--   2. Ajout de la colonne type_vente sur factures et ventes
--   3. Migration garantie de toutes les anciennes factures en COMPTOIR
--   4. Indexation optimisée
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeVente') THEN
        CREATE TYPE "TypeVente" AS ENUM ('COMPTOIR', 'YALIDINE');
    END IF;
END$$;

-- 1. Table factures
ALTER TABLE "factures" 
ADD COLUMN IF NOT EXISTS "type_vente" "TypeVente" NOT NULL DEFAULT 'COMPTOIR';

-- 2. Table ventes
ALTER TABLE "ventes" 
ADD COLUMN IF NOT EXISTS "type_vente" "TypeVente" NOT NULL DEFAULT 'COMPTOIR';

-- 3. Migration rétroactive des données historiques
UPDATE "factures" 
SET "type_vente" = 'COMPTOIR' 
WHERE "type_vente" IS NULL;

UPDATE "ventes" 
SET "type_vente" = 'COMPTOIR' 
WHERE "type_vente" IS NULL;

-- 4. Index de performance pour les filtres et la pagination
CREATE INDEX IF NOT EXISTS "factures_type_vente_idx" ON "factures"("type_vente");
CREATE INDEX IF NOT EXISTS "ventes_type_vente_idx" ON "ventes"("type_vente");
