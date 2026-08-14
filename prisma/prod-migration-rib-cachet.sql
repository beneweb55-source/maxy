-- ============================================================================
-- Migration PRODUCTION (Neon) — Ajout de RIB et Cachet
-- À exécuter manuellement sur la base de données de production dans l'éditeur SQL de Neon.
-- ============================================================================

ALTER TABLE "parametres" 
  ADD COLUMN IF NOT EXISTS "entreprise_rib" TEXT,
  ADD COLUMN IF NOT EXISTS "entreprise_cachet" TEXT;
