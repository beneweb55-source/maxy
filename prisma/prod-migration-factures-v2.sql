-- ============================================================================
-- Migration PRODUCTION (Neon) — Ajout de mode_paiement et updated_at
-- À exécuter manuellement sur la base de données de production.
-- ============================================================================

ALTER TABLE "factures" 
  ADD COLUMN IF NOT EXISTS "mode_paiement" TEXT DEFAULT 'especes',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
