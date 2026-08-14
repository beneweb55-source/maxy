-- ============================================================================
-- Migration PRODUCTION (Neon) — Ajout des champs pour la refonte des factures
-- À exécuter manuellement sur la base de données de production dans l'éditeur SQL de Neon.
-- ============================================================================

ALTER TABLE "factures" 
  ADD COLUMN IF NOT EXISTS "type_facture" TEXT NOT NULL DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS "client_adresse" TEXT,
  ADD COLUMN IF NOT EXISTS "client_rc" TEXT,
  ADD COLUMN IF NOT EXISTS "client_nif" TEXT,
  ADD COLUMN IF NOT EXISTS "client_ai" TEXT,
  ADD COLUMN IF NOT EXISTS "client_nis" TEXT;
