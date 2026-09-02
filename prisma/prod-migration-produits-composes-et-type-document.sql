-- =============================================================================
-- MIGRATION PRODUCTION : Produits Composés (BOM) + TypeDocument (Facturation)
-- Date       : 2026-09-02
-- Auteur     : AGY Lead Dev
-- ORDRE D'EXÉCUTION : Toujours dans une transaction, sur un backup récent.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PARTIE 1 : PRODUITS COMPOSÉS (BOM - Bill of Materials)
-- =============================================================================

-- 1a. Ajouter la valeur 'assemble' dans l'enum StatutProduit
--     (PostgreSQL ne permet pas ADD VALUE à l'intérieur d'une transaction
--      standard, on doit le faire en dehors ou via ALTER TYPE ... ADD VALUE)
--     NOTE : Si cette commande échoue en transaction, exécutez-la AVANT le BEGIN.
ALTER TYPE "StatutProduit" ADD VALUE IF NOT EXISTS 'assemble';

-- 1b. Ajouter la colonne parent_id sur la table produits
ALTER TABLE produits
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES produits(id) ON DELETE SET NULL;

-- 1c. Index sur parent_id pour les requêtes de composition
CREATE INDEX IF NOT EXISTS idx_produits_parent_id ON produits(parent_id);

-- =============================================================================
-- PARTIE 2 : ENUM TypeDocument + Migration type_facture → type_document
-- =============================================================================

-- 2a. Créer le nouvel enum TypeDocument
--     (si déjà existant depuis prisma migrate, ignorer l'erreur)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TypeDocument') THEN
    CREATE TYPE "TypeDocument" AS ENUM ('FACTURE_TVA', 'PROFORMA', 'DEVIS');
  END IF;
END $$;

-- 2b. Ajouter la nouvelle colonne type_document avec valeur par défaut FACTURE_TVA
ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS type_document "TypeDocument" NOT NULL DEFAULT 'FACTURE_TVA';

-- 2c. Mapper les anciennes valeurs de type_facture (String) vers le nouvel enum
--     Règles de mapping :
--       'normale'  → FACTURE_TVA  (facture standard)
--       'tva'      → FACTURE_TVA  (explicitement TVA)
--       'proforma' → PROFORMA
--       'devis'    → DEVIS
--       NULL / autre → FACTURE_TVA (par défaut sécurisé)
UPDATE factures SET type_document = 'PROFORMA'    WHERE type_facture ILIKE '%proforma%';
UPDATE factures SET type_document = 'DEVIS'       WHERE type_facture ILIKE '%devis%';
UPDATE factures SET type_document = 'FACTURE_TVA' WHERE type_facture IS NULL OR type_facture NOT IN ('proforma', 'devis');

-- 2d. Ajouter l'index sur type_document
CREATE INDEX IF NOT EXISTS idx_factures_type_document ON factures(type_document);

-- 2e. Supprimer l'ancienne colonne type_facture (String) maintenant remplacée
--     ⚠️ ATTENTION : Décommenter cette ligne SEULEMENT après avoir vérifié
--     que le mapping en 2c est correct et que l'application ne réfère plus
--     à type_facture. Garder en commentaire jusqu'à la validation complète.
-- ALTER TABLE factures DROP COLUMN IF EXISTS type_facture;

COMMIT;

-- =============================================================================
-- VÉRIFICATION POST-MIGRATION (exécuter manuellement pour valider)
-- =============================================================================
-- SELECT type_document, COUNT(*) FROM factures GROUP BY type_document;
-- SELECT COUNT(*) FROM produits WHERE parent_id IS NOT NULL;
-- SELECT COUNT(*) FROM produits WHERE statut = 'assemble';
