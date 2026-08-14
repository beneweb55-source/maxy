-- ============================================================================
-- Migration PRODUCTION (Neon) — Ajout des informations de l'entreprise
-- À exécuter manuellement sur la base de données de production.
-- ============================================================================

ALTER TABLE "parametres" 
  ADD COLUMN IF NOT EXISTS "entreprise_nom" TEXT NOT NULL DEFAULT 'Solution Maxi',
  ADD COLUMN IF NOT EXISTS "entreprise_adresse" TEXT NOT NULL DEFAULT 'Alger, Algérie',
  ADD COLUMN IF NOT EXISTS "entreprise_tel" TEXT NOT NULL DEFAULT '0000 00 00 00',
  ADD COLUMN IF NOT EXISTS "entreprise_rc" TEXT NOT NULL DEFAULT 'RC XXXXXXXXX',
  ADD COLUMN IF NOT EXISTS "entreprise_nif" TEXT NOT NULL DEFAULT 'NIF XXXXXXXXX',
  ADD COLUMN IF NOT EXISTS "entreprise_nis" TEXT NOT NULL DEFAULT 'NIS XXXXXXXXX',
  ADD COLUMN IF NOT EXISTS "entreprise_art" TEXT NOT NULL DEFAULT 'ART XXXXXXXXX';
