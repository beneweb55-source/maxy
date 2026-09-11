-- Idempotent SQL for bom_entries migration (safe for Vercel DB)
-- Run this on the Vercel/Neon database to add the BOM join table

CREATE TABLE IF NOT EXISTS "bom_entries" (
    "id" SERIAL NOT NULL,
    "produit_parent_id" INTEGER NOT NULL,
    "produit_composant_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bom_entries_pkey" PRIMARY KEY ("id")
);

-- Unique constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bom_entries_produit_parent_id_produit_composant_id_key'
  ) THEN
    ALTER TABLE "bom_entries" ADD CONSTRAINT "bom_entries_produit_parent_id_produit_composant_id_key"
      UNIQUE ("produit_parent_id", "produit_composant_id");
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "bom_entries_produit_parent_id_idx" ON "bom_entries"("produit_parent_id");
CREATE INDEX IF NOT EXISTS "bom_entries_produit_composant_id_idx" ON "bom_entries"("produit_composant_id");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bom_entries_produit_parent_id_fkey'
  ) THEN
    ALTER TABLE "bom_entries" ADD CONSTRAINT "bom_entries_produit_parent_id_fkey"
      FOREIGN KEY ("produit_parent_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bom_entries_produit_composant_id_fkey'
  ) THEN
    ALTER TABLE "bom_entries" ADD CONSTRAINT "bom_entries_produit_composant_id_fkey"
      FOREIGN KEY ("produit_composant_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
