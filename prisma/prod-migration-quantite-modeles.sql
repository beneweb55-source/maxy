-- ==============================================================================
-- MIGRATION PRODUCTION : COLONNE QUANTITE SUR MODELES & SYNCHRONISATION INITIALE
-- Date : 2026-09-02
-- ==============================================================================

-- 1. Valeurs enum StatutProduit manquantes si nécessaire
DO $$ BEGIN
  ALTER TYPE "StatutProduit" ADD VALUE IF NOT EXISTS 'produit_commande';
  ALTER TYPE "StatutProduit" ADD VALUE IF NOT EXISTS 'assemble';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ajout de la colonne quantite sur modeles
ALTER TABLE modeles ADD COLUMN IF NOT EXISTS quantite INTEGER NOT NULL DEFAULT 0;

-- 3. Synchronisation initiale : le stock de chaque modèle correspond au nombre
-- d'exemplaires réels non vendus, non HS et non assemblés
UPDATE modeles m
SET quantite = (
  SELECT COUNT(*) FROM produits p
  WHERE p.modele_id = m.id 
    AND p.statut NOT IN ('vendu', 'hs', 'assemble')
);

CREATE INDEX IF NOT EXISTS idx_modeles_quantite ON modeles(quantite);
