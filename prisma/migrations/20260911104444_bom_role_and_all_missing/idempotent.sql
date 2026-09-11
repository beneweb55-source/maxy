-- ============================================================================
-- MIGRATION COMPLÈTE IDÉMPOTENTE — Vercel Production Database
-- ============================================================================
-- Ce script est SÛR à exécuter sur n'importe quelle base Neon/PostgreSQL.
-- Il utilise des motifs IF NOT EXISTS/IF EXISTS pour être idempotent.
-- Exécuter une seule fois via le SQL Editor de Neon ou `psql`.
-- ============================================================================

-- ============================================================================
-- 1. ENUMS MANQUANTS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "Langue" AS ENUM ('fr', 'en');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BomRole" AS ENUM ('component', 'finished', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TypeDocument" AS ENUM ('FACTURE_TVA', 'PROFORMA', 'DEVIS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CarnetCategorie" AS ENUM ('developpement', 'inventaire', 'caisse', 'tests', 'maintenance', 'ui_ux', 'reseau', 'materiel', 'administration', 'recherche', 'correction', 'autre');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatutProposition" AS ENUM ('en_attente', 'conflit', 'valide', 'rejete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TypeVente" AS ENUM ('COMPTOIR', 'YALIDINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CanalVente" AS ENUM ('COMPTOIR', 'YALIDINE', 'OUEDKNISS', 'TELEPHONE', 'FACEBOOK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'TERMINEE', 'ANNULEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CaisseDestination" AS ENUM ('CAISSE_PHYSIQUE', 'CAISSE_YALIDINE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TypePaiement" AS ENUM ('especes', 'virement', 'carte', 'cheque');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajout de valeurs aux enums existants (idempotent)
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'social_media';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "StatutProduit" ADD VALUE 'produit_commande';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "StatutProduit" ADD VALUE 'assemble';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "TypeMouvement" ADD VALUE 'sortie';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. AJOUT DE COLONNES MANQUANTES (IF NOT EXISTS via DO blocks)
-- ============================================================================

-- users: langue
DO $$ BEGIN
  ALTER TABLE "users" ADD COLUMN "langue" "Langue" NOT NULL DEFAULT 'fr';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- mouvements_caisse: caisse
DO $$ BEGIN
  ALTER TABLE "mouvements_caisse" ADD COLUMN "caisse" "CaisseDestination" NOT NULL DEFAULT 'CAISSE_PHYSIQUE';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- notifications: groupe, type
DO $$ BEGIN
  ALTER TABLE "notifications" ADD COLUMN "groupe" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD COLUMN "type" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- parametres: nouvelles colonnes entreprise
DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "caisse_vide_a" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_adresse" TEXT NOT NULL DEFAULT 'Alger, Algérie';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_art" TEXT NOT NULL DEFAULT 'ART XXXXXXXXX';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_cachet" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_nif" TEXT NOT NULL DEFAULT 'NIF XXXXXXXXX';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_nis" TEXT NOT NULL DEFAULT 'NIS XXXXXXXXX';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_nom" TEXT NOT NULL DEFAULT 'Solution Maxi';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_rc" TEXT NOT NULL DEFAULT 'RC XXXXXXXXX';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_rib" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "parametres" ADD COLUMN "entreprise_tel" TEXT NOT NULL DEFAULT '0000 00 00 00';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ventes: type_vente
DO $$ BEGIN
  ALTER TABLE "ventes" ADD COLUMN "type_vente" "TypeVente" NOT NULL DEFAULT 'COMPTOIR';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- products: toutes les colonnes BOM et autres manquantes
DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "bom_role" "BomRole" NOT NULL DEFAULT 'finished';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "categorie_id" INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "emplacement" TEXT DEFAULT 'reserve';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "en_vitrine" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "est_compose" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "etiquette_imprimee" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "etiquette_imprimee_le" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "grade" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "modele_id" INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "numero_serie" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "parent_id" INTEGER;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD COLUMN "poste_reseaux" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- lot_id nullable (originally NOT NULL)
DO $$ BEGIN
  ALTER TABLE "produits" ALTER COLUMN "lot_id" DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; WHEN others THEN NULL;
END $$;

-- ============================================================================
-- 3. TABLES MANQUANTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS "categories" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "parent_id" INTEGER,
    "image_url" TEXT,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "attributs_schema" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "modeles" (
    "id" SERIAL NOT NULL,
    "categorie_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "image_url" TEXT,
    "description" TEXT,
    "attributs" JSONB,
    "prix_vente_conseille" INTEGER,
    "quantite" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "modeles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "categories_info" (
    "nom" TEXT NOT NULL,
    "image_url" TEXT,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categories_info_pkey" PRIMARY KEY ("nom")
);

CREATE TABLE IF NOT EXISTS "familles_info" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "image_url" TEXT,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "familles_info_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "produit_images" (
    "id" SERIAL NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "produit_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "composition_historique" (
    "id" SERIAL NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "produit_parent_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "composant_remplace_id" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "composition_historique_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "factures" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "date_emission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type_document" "TypeDocument" NOT NULL DEFAULT 'FACTURE_TVA',
    "client_nom" TEXT,
    "client_adresse" TEXT,
    "client_tel" TEXT,
    "client_rc" TEXT,
    "client_nif" TEXT,
    "client_ai" TEXT,
    "client_nis" TEXT,
    "total" INTEGER NOT NULL,
    "garantie_mois" INTEGER NOT NULL DEFAULT 6,
    "garantie_fin" TIMESTAMP(3) NOT NULL,
    "canal" TEXT,
    "groupe_vente" TEXT,
    "cree_par" INTEGER NOT NULL,
    "annulee" BOOLEAN NOT NULL DEFAULT false,
    "mode_paiement" TEXT DEFAULT 'especes',
    "canal_vente" "CanalVente" DEFAULT 'COMPTOIR',
    "caisse_destination" "CaisseDestination" NOT NULL DEFAULT 'CAISSE_PHYSIQUE',
    "type_vente" "TypeVente" NOT NULL DEFAULT 'COMPTOIR',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commande_id" INTEGER,
    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "facture_lignes" (
    "id" SERIAL NOT NULL,
    "facture_id" INTEGER NOT NULL,
    "produit_id" INTEGER,
    "vente_id" INTEGER,
    "code_interne" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "categorie" TEXT,
    "prix" INTEGER NOT NULL,
    "garantie_fin" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "facture_lignes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "journal_activite" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entite_type" TEXT,
    "entite_id" INTEGER,
    "details" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "journal_activite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "fcm_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "carnet_entrees" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "categories" "CarnetCategorie"[],
    "contenu" TEXT NOT NULL,
    "date_travail" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "carnet_entrees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "carnet_pieces_jointes" (
    "id" SERIAL NOT NULL,
    "entree_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "carnet_pieces_jointes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "propositions_migration" (
    "id" TEXT NOT NULL,
    "groupe_categorie" TEXT NOT NULL,
    "groupe_reference" TEXT NOT NULL,
    "cible_categorie_id" INTEGER,
    "cible_modele_nom" TEXT,
    "cible_attributs" JSONB,
    "statut" "StatutProposition" NOT NULL DEFAULT 'en_attente',
    "confiance" INTEGER NOT NULL,
    "raisons_json" JSONB,
    "nb_produits" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "propositions_migration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "migration_logs" (
    "id" SERIAL NOT NULL,
    "batch_id" TEXT NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "modele_id_avant" INTEGER,
    "modele_id_apres" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "migration_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "clients" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "registre_commerce" TEXT,
    "nif" TEXT,
    "nis" TEXT,
    "article_imposition" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "commandes" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "date_commande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canal" "CanalVente" NOT NULL DEFAULT 'COMPTOIR',
    "statut" "StatutCommande" NOT NULL DEFAULT 'EN_ATTENTE',
    "caisse" "CaisseDestination" NOT NULL DEFAULT 'CAISSE_PHYSIQUE',
    "type_paiement" "TypePaiement" NOT NULL DEFAULT 'especes',
    "payee" BOOLEAN NOT NULL DEFAULT false,
    "client_id" INTEGER,
    "client_nom" TEXT,
    "client_tel" TEXT,
    "client_adresse" TEXT,
    "wilaya" TEXT,
    "commune" TEXT,
    "frais_livraison" INTEGER NOT NULL DEFAULT 0,
    "total_ht" INTEGER NOT NULL,
    "total_tva" INTEGER NOT NULL DEFAULT 0,
    "total_ttc" INTEGER NOT NULL,
    "remise_globale" INTEGER NOT NULL DEFAULT 0,
    "garantie_mois" INTEGER NOT NULL DEFAULT 6,
    "garantie_fin" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "cree_par" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "commandes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lignes_commande" (
    "id" SERIAL NOT NULL,
    "commande_id" INTEGER NOT NULL,
    "produit_id" INTEGER,
    "modele_id" INTEGER,
    "code_interne" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "numero_serie" TEXT,
    "categorie" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prix_unitaire" INTEGER NOT NULL,
    "remise_ligne" INTEGER NOT NULL DEFAULT 0,
    "total_ligne" INTEGER NOT NULL,
    "mode_ajout" TEXT DEFAULT 'scan',
    "etiquette_imprimee" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "lignes_commande_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- 4. INDEX MANQUANTS (IF NOT EXISTS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS "modeles_categorie_id_idx" ON "modeles"("categorie_id");
CREATE INDEX IF NOT EXISTS "produit_images_produit_id_idx" ON "produit_images"("produit_id");
CREATE INDEX IF NOT EXISTS "composition_historique_produit_id_idx" ON "composition_historique"("produit_id");
CREATE INDEX IF NOT EXISTS "composition_historique_produit_parent_id_idx" ON "composition_historique"("produit_parent_id");
CREATE INDEX IF NOT EXISTS "composition_historique_created_at_idx" ON "composition_historique"("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "factures_numero_key" ON "factures"("numero");
CREATE INDEX IF NOT EXISTS "factures_date_emission_idx" ON "factures"("date_emission");
CREATE INDEX IF NOT EXISTS "factures_type_document_idx" ON "factures"("type_document");
CREATE INDEX IF NOT EXISTS "factures_type_vente_idx" ON "factures"("type_vente");
CREATE INDEX IF NOT EXISTS "factures_commande_id_idx" ON "factures"("commande_id");
CREATE INDEX IF NOT EXISTS "factures_caisse_destination_idx" ON "factures"("caisse_destination");
CREATE INDEX IF NOT EXISTS "facture_lignes_facture_id_idx" ON "facture_lignes"("facture_id");
CREATE INDEX IF NOT EXISTS "journal_activite_user_id_idx" ON "journal_activite"("user_id");
CREATE INDEX IF NOT EXISTS "journal_activite_action_idx" ON "journal_activite"("action");
CREATE INDEX IF NOT EXISTS "journal_activite_created_at_idx" ON "journal_activite"("created_at");
CREATE INDEX IF NOT EXISTS "journal_activite_entite_type_entite_id_idx" ON "journal_activite"("entite_type", "entite_id");
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "fcm_tokens_token_key" ON "fcm_tokens"("token");
CREATE INDEX IF NOT EXISTS "fcm_tokens_user_id_idx" ON "fcm_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "migration_logs_batch_id_idx" ON "migration_logs"("batch_id");
CREATE INDEX IF NOT EXISTS "migration_logs_produit_id_idx" ON "migration_logs"("produit_id");
CREATE UNIQUE INDEX IF NOT EXISTS "commandes_numero_key" ON "commandes"("numero");
CREATE INDEX IF NOT EXISTS "commandes_date_commande_idx" ON "commandes"("date_commande");
CREATE INDEX IF NOT EXISTS "commandes_statut_idx" ON "commandes"("statut");
CREATE INDEX IF NOT EXISTS "commandes_canal_idx" ON "commandes"("canal");
CREATE INDEX IF NOT EXISTS "commandes_caisse_idx" ON "commandes"("caisse");
CREATE INDEX IF NOT EXISTS "commandes_client_id_idx" ON "commandes"("client_id");
CREATE INDEX IF NOT EXISTS "lignes_commande_commande_id_idx" ON "lignes_commande"("commande_id");
CREATE INDEX IF NOT EXISTS "lignes_commande_produit_id_idx" ON "lignes_commande"("produit_id");
CREATE INDEX IF NOT EXISTS "historique_statuts_produit_id_idx" ON "historique_statuts"("produit_id");
CREATE INDEX IF NOT EXISTS "mouvements_caisse_produit_id_idx" ON "mouvements_caisse"("produit_id");
CREATE INDEX IF NOT EXISTS "mouvements_caisse_lot_id_idx" ON "mouvements_caisse"("lot_id");
CREATE INDEX IF NOT EXISTS "mouvements_caisse_date_idx" ON "mouvements_caisse"("date");
CREATE INDEX IF NOT EXISTS "mouvements_caisse_caisse_idx" ON "mouvements_caisse"("caisse");
CREATE INDEX IF NOT EXISTS "notifications_user_id_groupe_lu_idx" ON "notifications"("user_id", "groupe", "lu");
CREATE INDEX IF NOT EXISTS "produits_lot_id_idx" ON "produits"("lot_id");
CREATE INDEX IF NOT EXISTS "produits_modele_id_idx" ON "produits"("modele_id");
CREATE INDEX IF NOT EXISTS "produits_categorie_id_idx" ON "produits"("categorie_id");
CREATE INDEX IF NOT EXISTS "produits_statut_idx" ON "produits"("statut");
CREATE INDEX IF NOT EXISTS "produits_en_vitrine_idx" ON "produits"("en_vitrine");
CREATE INDEX IF NOT EXISTS "produits_poste_reseaux_idx" ON "produits"("poste_reseaux");
CREATE INDEX IF NOT EXISTS "produits_numero_serie_idx" ON "produits"("numero_serie");
CREATE INDEX IF NOT EXISTS "produits_categorie_idx" ON "produits"("categorie");
CREATE INDEX IF NOT EXISTS "produits_lot_id_reference_categorie_idx" ON "produits"("lot_id", "reference", "categorie");
CREATE INDEX IF NOT EXISTS "produits_parent_id_idx" ON "produits"("parent_id");
CREATE INDEX IF NOT EXISTS "reparations_produit_id_idx" ON "reparations"("produit_id");
CREATE INDEX IF NOT EXISTS "ventes_produit_id_idx" ON "ventes"("produit_id");
CREATE INDEX IF NOT EXISTS "ventes_date_vente_idx" ON "ventes"("date_vente");
CREATE INDEX IF NOT EXISTS "ventes_type_vente_idx" ON "ventes"("type_vente");

-- ============================================================================
-- 5. FOREIGN KEYS (IF NOT EXISTS via DO blocks)
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "modeles" ADD CONSTRAINT "modeles_categorie_id_fkey"
    FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD CONSTRAINT "produits_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD CONSTRAINT "produits_modele_id_fkey"
    FOREIGN KEY ("modele_id") REFERENCES "modeles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_fkey"
    FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" DROP CONSTRAINT IF EXISTS "produits_lot_id_fkey";
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produits" ADD CONSTRAINT "produits_lot_id_fkey"
    FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "produit_images" ADD CONSTRAINT "produit_images_produit_id_fkey"
    FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "composition_historique" ADD CONSTRAINT "composition_historique_produit_id_fkey"
    FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "composition_historique" ADD CONSTRAINT "composition_historique_produit_parent_id_fkey"
    FOREIGN KEY ("produit_parent_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "composition_historique" ADD CONSTRAINT "composition_historique_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "factures" ADD CONSTRAINT "factures_commande_id_fkey"
    FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "factures" ADD CONSTRAINT "factures_cree_par_fkey"
    FOREIGN KEY ("cree_par") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "facture_lignes" ADD CONSTRAINT "facture_lignes_facture_id_fkey"
    FOREIGN KEY ("facture_id") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "journal_activite" ADD CONSTRAINT "journal_activite_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "carnet_entrees" ADD CONSTRAINT "carnet_entrees_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "carnet_pieces_jointes" ADD CONSTRAINT "carnet_pieces_jointes_entree_id_fkey"
    FOREIGN KEY ("entree_id") REFERENCES "carnet_entrees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "commandes" ADD CONSTRAINT "commandes_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "commandes" ADD CONSTRAINT "commandes_cree_par_fkey"
    FOREIGN KEY ("cree_par") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commande_id_fkey"
    FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_produit_id_fkey"
    FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_modele_id_fkey"
    FOREIGN KEY ("modele_id") REFERENCES "modeles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 6. BOOTSTRAP PRISMA MIGRATION TRACKING (pour que prisma migrate deploy fonctionne)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMP(3),
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Marquer les 3 migrations comme appliquées (checksum = sha256 du fichier SQL)
DO $$ BEGIN
  INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
  VALUES
    ('00000000-0000-0000-0000-000000000001', '716fdebe7f65bd5ec5bd58ca2181f7d6d8afe64bd31ab58a0a42097bd0c8e304', NOW(), '20260711003600_init', 1),
    ('00000000-0000-0000-0000-000000000002', '3e1b5728790a271f3eed700b819d2ad1d967db2d103a5628febc640478acc1bb', NOW(), '20260718092926_evolutions', 1),
    ('00000000-0000-0000-0000-000000000003', '2f84c85e638c9a1e335e3e329b789acb29a25a26f02c7dc801c12077c44fdae0', NOW(), '20260911104444_bom_role_and_all_missing', 1)
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- FIN — La DB est maintenant synchronisée avec le schéma Prisma
-- ============================================================================
