-- ==============================================================================
-- MIGRATION PRODUCTION : CRÉATION ET CONFIGURATION COMPLÈTE DE LA TABLE MODELES
-- Résout les erreurs 500 sur /api/modeles et la création de modèles
-- ==============================================================================

-- 1. Création de la table modeles si elle n'existe pas
CREATE TABLE IF NOT EXISTS "modeles" (
    "id" SERIAL PRIMARY KEY,
    "categorie_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "image_url" TEXT,
    "description" TEXT,
    "attributs" JSONB DEFAULT '{}'::jsonb,
    "prix_vente_conseille" INTEGER,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ajout des colonnes au cas où la table modeles existait partiellement
ALTER TABLE "modeles" ADD COLUMN IF NOT EXISTS "attributs" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE "modeles" ADD COLUMN IF NOT EXISTS "prix_vente_conseille" INTEGER;
ALTER TABLE "modeles" ADD COLUMN IF NOT EXISTS "quantite" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "modeles" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
ALTER TABLE "modeles" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 3. Clé étrangère entre modeles et categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'modeles_categorie_id_fkey'
  ) THEN
    ALTER TABLE "modeles" ADD CONSTRAINT "modeles_categorie_id_fkey" 
      FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Ajout de la colonne modele_id sur produits et liaison avec modeles
ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "modele_id" INTEGER;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produits_modele_id_fkey'
  ) THEN
    ALTER TABLE "produits" ADD CONSTRAINT "produits_modele_id_fkey" 
      FOREIGN KEY ("modele_id") REFERENCES "modeles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. Ajout de la colonne modele_id sur lignes_commande si la table existe
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lignes_commande') THEN
    ALTER TABLE "lignes_commande" ADD COLUMN IF NOT EXISTS "modele_id" INTEGER;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lignes_commande_modele_id_fkey') THEN
      ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_modele_id_fkey" 
        FOREIGN KEY ("modele_id") REFERENCES "modeles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Index de performance
CREATE INDEX IF NOT EXISTS "modeles_categorie_id_idx" ON "modeles"("categorie_id");
CREATE INDEX IF NOT EXISTS "idx_modeles_quantite" ON "modeles"("quantite");
CREATE INDEX IF NOT EXISTS "produits_modele_id_idx" ON "produits"("modele_id");

-- 7. Valeurs enum StatutProduit si nécessaires
DO $$ BEGIN
  ALTER TYPE "StatutProduit" ADD VALUE IF NOT EXISTS 'produit_commande';
  ALTER TYPE "StatutProduit" ADD VALUE IF NOT EXISTS 'assemble';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
