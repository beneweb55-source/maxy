-- Script SQL pour ajouter la colonne bom_role à la table Produit
-- Usage: exécuter ce script sur la base de données Vercel/production
-- si elle ne contient pas encore la colonne.

-- 1. Ajouter la colonne avec une valeur par défaut
ALTER TABLE "Produit" ADD COLUMN IF NOT EXISTS "bom_role" TEXT NOT NULL DEFAULT 'finished';

-- 2. (Optionnel) Créer un commentaire pour documentation
COMMENT ON COLUMN "Produit"."bom_role" IS 'component = intégré à un autre produit, finished = vendu seul, both = les deux';
