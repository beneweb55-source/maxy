-- ============================================================================
-- Migration PRODUCTION (Neon) — Vitrine + Photos multiples
-- À exécuter UNE FOIS sur la base de production (console SQL Neon ou psql).
--
-- Idempotent et SÛR : purement additif. N'ajoute qu'une colonne et une table.
-- Aucune donnée existante n'est touchée.
--
-- Nouveautés :
--   • produits.en_vitrine        (produit exposé physiquement en vitrine)
--   • table produit_images       (galerie de photos supplémentaires par produit)
-- ============================================================================

ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "en_vitrine" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "produit_images" (
  "id"         SERIAL       NOT NULL,
  "produit_id" INTEGER      NOT NULL,
  "data"       TEXT         NOT NULL,
  "position"   INTEGER      NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "produit_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "produit_images_produit_id_idx" ON "produit_images" ("produit_id");

DO $$
BEGIN
  ALTER TABLE "produit_images"
    ADD CONSTRAINT "produit_images_produit_id_fkey"
    FOREIGN KEY ("produit_id") REFERENCES "produits" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
