-- ============================================================================
-- Migration PRODUCTION (Neon) — évolutions Inventaire / Lots / Ventes
-- À exécuter UNE FOIS sur la base de production (console SQL Neon ou psql).
--
-- Idempotent et SÛR : n'ajoute que les colonnes manquantes. Ne touche pas aux
-- colonnes déjà présentes en prod (image_url, quantite_attendue, pct_*), qui
-- font partie de la migration Prisma `evolutions` mais existent déjà en prod.
--
-- Colonnes réellement nouvelles ajoutées ici :
--   • enum ModeCout            (manuel | auto)
--   • lots.mode_cout           (mode de coût du lot)
--   • lots.cout_valide         (coût validé en caisse ou non)
--   • produits.a_jeter         (sous-statut « à jeter » des produits HS)
--   • ventes.groupe_vente      (identifiant de bundle pour les ventes groupées)
-- ============================================================================

DO $$
BEGIN
  CREATE TYPE "ModeCout" AS ENUM ('manuel', 'auto');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "lots"     ADD COLUMN IF NOT EXISTS "mode_cout"   "ModeCout" NOT NULL DEFAULT 'manuel';
ALTER TABLE "lots"     ADD COLUMN IF NOT EXISTS "cout_valide" BOOLEAN    NOT NULL DEFAULT false;
ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "a_jeter"     BOOLEAN    NOT NULL DEFAULT false;
ALTER TABLE "ventes"   ADD COLUMN IF NOT EXISTS "groupe_vente" TEXT;
