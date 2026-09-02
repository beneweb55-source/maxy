-- =============================================================================
-- MIGRATION PRODUCTION : OMS Omnicanal (Canaux, Statuts & Caisses Étanche)
-- Date   : 2026-09-02
-- Module : OMS / ERP Solution Maxi
-- =============================================================================

-- 1. Création des nouveaux Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CanalVente') THEN
    CREATE TYPE "CanalVente" AS ENUM ('COMPTOIR', 'YALIDINE', 'OUEDKNISS', 'TELEPHONE', 'FACEBOOK');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaisseDestination') THEN
    CREATE TYPE "CaisseDestination" AS ENUM ('CAISSE_PHYSIQUE', 'CAISSE_YALIDINE');
  END IF;
END $$;

-- 2. Migration de l'Enum StatutCommande
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatutCommande_new') THEN
    CREATE TYPE "StatutCommande_new" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'TERMINEE', 'ANNULEE');
  END IF;
END $$;

-- 3. Mettre à jour la table commandes
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS canal "CanalVente" NOT NULL DEFAULT 'COMPTOIR',
  ADD COLUMN IF NOT EXISTS caisse "CaisseDestination" NOT NULL DEFAULT 'CAISSE_PHYSIQUE',
  ADD COLUMN IF NOT EXISTS frais_livraison INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wilaya TEXT,
  ADD COLUMN IF NOT EXISTS commune TEXT,
  ADD COLUMN IF NOT EXISTS payee BOOLEAN NOT NULL DEFAULT false;

-- Conversion propre du statut de commande existant
ALTER TABLE commandes ALTER COLUMN statut DROP DEFAULT;
ALTER TABLE commandes ALTER COLUMN statut TYPE "StatutCommande_new" USING (
  CASE statut::text
    WHEN 'payee' THEN 'TERMINEE'::"StatutCommande_new"
    WHEN 'en_attente' THEN 'EN_ATTENTE'::"StatutCommande_new"
    WHEN 'devis' THEN 'EN_ATTENTE'::"StatutCommande_new"
    WHEN 'annulee' THEN 'ANNULEE'::"StatutCommande_new"
    ELSE 'EN_ATTENTE'::"StatutCommande_new"
  END
);
ALTER TABLE commandes ALTER COLUMN statut SET DEFAULT 'EN_ATTENTE';
DROP TYPE IF EXISTS "StatutCommande";
ALTER TYPE "StatutCommande_new" RENAME TO "StatutCommande";

-- Index sur commandes
CREATE INDEX IF NOT EXISTS idx_commandes_canal ON commandes(canal);
CREATE INDEX IF NOT EXISTS idx_commandes_caisse ON commandes(caisse);

-- 4. Mettre à jour la table factures
ALTER TABLE factures
  ADD COLUMN IF NOT EXISTS canal_vente "CanalVente" DEFAULT 'COMPTOIR',
  ADD COLUMN IF NOT EXISTS caisse_destination "CaisseDestination" NOT NULL DEFAULT 'CAISSE_PHYSIQUE';

CREATE INDEX IF NOT EXISTS idx_factures_caisse_destination ON factures(caisse_destination);

-- 5. Mettre à jour la table mouvements_caisse
ALTER TABLE mouvements_caisse
  ADD COLUMN IF NOT EXISTS caisse "CaisseDestination" NOT NULL DEFAULT 'CAISSE_PHYSIQUE';

CREATE INDEX IF NOT EXISTS idx_mouvements_caisse_destination ON mouvements_caisse(caisse);
