-- ============================================================================
-- Migration PRODUCTION (Neon) — Factures & garantie
-- À exécuter UNE FOIS. Idempotent et purement additif.
--
--   • factures        : une facture par vente (simple ou groupée)
--   • facture_lignes  : un produit vendu par ligne, avec sa fin de garantie
--
-- Les libellés sont dénormalisés : la facture reste exacte même si le produit
-- est ensuite modifié ou supprimé.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "factures" (
  "id"            SERIAL       NOT NULL,
  "numero"        TEXT         NOT NULL,
  "date_emission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "client_nom"    TEXT,
  "client_tel"    TEXT,
  "total"         INTEGER      NOT NULL,
  "garantie_mois" INTEGER      NOT NULL DEFAULT 6,
  "garantie_fin"  TIMESTAMP(3) NOT NULL,
  "canal"         TEXT,
  "groupe_vente"  TEXT,
  "cree_par"      INTEGER      NOT NULL,
  "annulee"       BOOLEAN      NOT NULL DEFAULT false,
  CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "factures_numero_key" ON "factures" ("numero");
CREATE INDEX IF NOT EXISTS "factures_date_emission_idx" ON "factures" ("date_emission");

CREATE TABLE IF NOT EXISTS "facture_lignes" (
  "id"           SERIAL       NOT NULL,
  "facture_id"   INTEGER      NOT NULL,
  "produit_id"   INTEGER,
  "vente_id"     INTEGER,
  "code_interne" TEXT         NOT NULL,
  "designation"  TEXT         NOT NULL,
  "categorie"    TEXT,
  "prix"         INTEGER      NOT NULL,
  "garantie_fin" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "facture_lignes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "facture_lignes_facture_id_idx" ON "facture_lignes" ("facture_id");

DO $$
BEGIN
  ALTER TABLE "factures"
    ADD CONSTRAINT "factures_cree_par_fkey"
    FOREIGN KEY ("cree_par") REFERENCES "users" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "facture_lignes"
    ADD CONSTRAINT "facture_lignes_facture_id_fkey"
    FOREIGN KEY ("facture_id") REFERENCES "factures" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
