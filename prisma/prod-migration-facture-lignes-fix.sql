-- ============================================================================
-- Correctif PRODUCTION (Neon) — Renommage de la table FactureLigne
-- ============================================================================

DROP TABLE IF EXISTS "FactureLigne" CASCADE;

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

ALTER TABLE "facture_lignes" ADD CONSTRAINT "facture_lignes_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
