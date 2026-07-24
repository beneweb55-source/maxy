-- ============================================================================
-- Migration PRODUCTION (Neon) — Produit sans arrivage (lot optionnel)
-- À exécuter UNE FOIS. Idempotent et sûr.
--
--   • produits.lot_id devient NULLABLE : un produit peut vivre dans
--     l'inventaire sans être rattaché à un lot d'arrivage.
--   • produits.created_at : date d'entrée propre au produit (utilisée quand il
--     n'a pas de lot). Rétro-remplie depuis la 1re entrée d'historique (sa
--     création), sinon la date du lot.
-- ============================================================================

ALTER TABLE "produits" ALTER COLUMN "lot_id" DROP NOT NULL;

ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Rétro-remplissage de created_at pour les produits existants (stable si relancé).
UPDATE "produits" p
SET "created_at" = COALESCE(
  (SELECT MIN(h."created_at") FROM "historique_statuts" h WHERE h."produit_id" = p."id"),
  (SELECT l."date_entree" FROM "lots" l WHERE l."id" = p."lot_id"),
  p."created_at"
);
