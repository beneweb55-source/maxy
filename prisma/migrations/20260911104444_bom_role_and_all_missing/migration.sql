-- CreateEnum
CREATE TYPE "Langue" AS ENUM ('fr', 'en');

-- CreateEnum
CREATE TYPE "BomRole" AS ENUM ('component', 'finished', 'both');

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('FACTURE_TVA', 'PROFORMA', 'DEVIS');

-- CreateEnum
CREATE TYPE "CarnetCategorie" AS ENUM ('developpement', 'inventaire', 'caisse', 'tests', 'maintenance', 'ui_ux', 'reseau', 'materiel', 'administration', 'recherche', 'correction', 'autre');

-- CreateEnum
CREATE TYPE "StatutProposition" AS ENUM ('en_attente', 'conflit', 'valide', 'rejete');

-- CreateEnum
CREATE TYPE "TypeVente" AS ENUM ('COMPTOIR', 'YALIDINE');

-- CreateEnum
CREATE TYPE "CanalVente" AS ENUM ('COMPTOIR', 'YALIDINE', 'OUEDKNISS', 'TELEPHONE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'EN_LIVRAISON', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "CaisseDestination" AS ENUM ('CAISSE_PHYSIQUE', 'CAISSE_YALIDINE');

-- CreateEnum
CREATE TYPE "TypePaiement" AS ENUM ('especes', 'virement', 'carte', 'cheque');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'social_media';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StatutProduit" ADD VALUE 'produit_commande';
ALTER TYPE "StatutProduit" ADD VALUE 'assemble';

-- AlterEnum
ALTER TYPE "TypeMouvement" ADD VALUE 'sortie';

-- DropForeignKey
ALTER TABLE "produits" DROP CONSTRAINT "produits_lot_id_fkey";

-- AlterTable
ALTER TABLE "mouvements_caisse" ADD COLUMN     "caisse" "CaisseDestination" NOT NULL DEFAULT 'CAISSE_PHYSIQUE';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "groupe" TEXT,
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "parametres" ADD COLUMN     "caisse_vide_a" TIMESTAMP(3),
ADD COLUMN     "entreprise_adresse" TEXT NOT NULL DEFAULT 'Alger, Algérie',
ADD COLUMN     "entreprise_art" TEXT NOT NULL DEFAULT 'ART XXXXXXXXX',
ADD COLUMN     "entreprise_cachet" TEXT,
ADD COLUMN     "entreprise_nif" TEXT NOT NULL DEFAULT 'NIF XXXXXXXXX',
ADD COLUMN     "entreprise_nis" TEXT NOT NULL DEFAULT 'NIS XXXXXXXXX',
ADD COLUMN     "entreprise_nom" TEXT NOT NULL DEFAULT 'Solution Maxi',
ADD COLUMN     "entreprise_rc" TEXT NOT NULL DEFAULT 'RC XXXXXXXXX',
ADD COLUMN     "entreprise_rib" TEXT,
ADD COLUMN     "entreprise_tel" TEXT NOT NULL DEFAULT '0000 00 00 00';

-- AlterTable
ALTER TABLE "produits" ADD COLUMN     "bom_role" "BomRole" NOT NULL DEFAULT 'finished',
ADD COLUMN     "categorie_id" INTEGER,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emplacement" TEXT DEFAULT 'reserve',
ADD COLUMN     "en_vitrine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "est_compose" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "etiquette_imprimee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "etiquette_imprimee_le" TIMESTAMP(3),
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "modele_id" INTEGER,
ADD COLUMN     "numero_serie" TEXT,
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "poste_reseaux" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "lot_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "langue" "Langue" NOT NULL DEFAULT 'fr';

-- AlterTable
ALTER TABLE "ventes" ADD COLUMN     "type_vente" "TypeVente" NOT NULL DEFAULT 'COMPTOIR';

-- CreateTable
CREATE TABLE "categories" (
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

-- CreateTable
CREATE TABLE "modeles" (
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

-- CreateTable
CREATE TABLE "categories_info" (
    "nom" TEXT NOT NULL,
    "image_url" TEXT,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_info_pkey" PRIMARY KEY ("nom")
);

-- CreateTable
CREATE TABLE "familles_info" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "image_url" TEXT,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "familles_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit_images" (
    "id" SERIAL NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produit_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "composition_historique" (
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

-- CreateTable
CREATE TABLE "factures" (
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

-- CreateTable
CREATE TABLE "facture_lignes" (
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

-- CreateTable
CREATE TABLE "journal_activite" (
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

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fcm_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "device" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carnet_entrees" (
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

-- CreateTable
CREATE TABLE "carnet_pieces_jointes" (
    "id" SERIAL NOT NULL,
    "entree_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carnet_pieces_jointes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propositions_migration" (
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

-- CreateTable
CREATE TABLE "migration_logs" (
    "id" SERIAL NOT NULL,
    "batch_id" TEXT NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "modele_id_avant" INTEGER,
    "modele_id_apres" INTEGER,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
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

-- CreateTable
CREATE TABLE "commandes" (
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

-- CreateTable
CREATE TABLE "lignes_commande" (
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

-- CreateIndex
CREATE INDEX "modeles_categorie_id_idx" ON "modeles"("categorie_id");

-- CreateIndex
CREATE INDEX "produit_images_produit_id_idx" ON "produit_images"("produit_id");

-- CreateIndex
CREATE INDEX "composition_historique_produit_id_idx" ON "composition_historique"("produit_id");

-- CreateIndex
CREATE INDEX "composition_historique_produit_parent_id_idx" ON "composition_historique"("produit_parent_id");

-- CreateIndex
CREATE INDEX "composition_historique_created_at_idx" ON "composition_historique"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "factures_numero_key" ON "factures"("numero");

-- CreateIndex
CREATE INDEX "factures_date_emission_idx" ON "factures"("date_emission");

-- CreateIndex
CREATE INDEX "factures_type_document_idx" ON "factures"("type_document");

-- CreateIndex
CREATE INDEX "factures_type_vente_idx" ON "factures"("type_vente");

-- CreateIndex
CREATE INDEX "factures_commande_id_idx" ON "factures"("commande_id");

-- CreateIndex
CREATE INDEX "factures_caisse_destination_idx" ON "factures"("caisse_destination");

-- CreateIndex
CREATE INDEX "facture_lignes_facture_id_idx" ON "facture_lignes"("facture_id");

-- CreateIndex
CREATE INDEX "journal_activite_user_id_idx" ON "journal_activite"("user_id");

-- CreateIndex
CREATE INDEX "journal_activite_action_idx" ON "journal_activite"("action");

-- CreateIndex
CREATE INDEX "journal_activite_created_at_idx" ON "journal_activite"("created_at");

-- CreateIndex
CREATE INDEX "journal_activite_entite_type_entite_id_idx" ON "journal_activite"("entite_type", "entite_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "fcm_tokens_user_id_idx" ON "fcm_tokens"("user_id");

-- CreateIndex
CREATE INDEX "migration_logs_batch_id_idx" ON "migration_logs"("batch_id");

-- CreateIndex
CREATE INDEX "migration_logs_produit_id_idx" ON "migration_logs"("produit_id");

-- CreateIndex
CREATE UNIQUE INDEX "commandes_numero_key" ON "commandes"("numero");

-- CreateIndex
CREATE INDEX "commandes_date_commande_idx" ON "commandes"("date_commande");

-- CreateIndex
CREATE INDEX "commandes_statut_idx" ON "commandes"("statut");

-- CreateIndex
CREATE INDEX "commandes_canal_idx" ON "commandes"("canal");

-- CreateIndex
CREATE INDEX "commandes_caisse_idx" ON "commandes"("caisse");

-- CreateIndex
CREATE INDEX "commandes_client_id_idx" ON "commandes"("client_id");

-- CreateIndex
CREATE INDEX "lignes_commande_commande_id_idx" ON "lignes_commande"("commande_id");

-- CreateIndex
CREATE INDEX "lignes_commande_produit_id_idx" ON "lignes_commande"("produit_id");

-- CreateIndex
CREATE INDEX "historique_statuts_produit_id_idx" ON "historique_statuts"("produit_id");

-- CreateIndex
CREATE INDEX "mouvements_caisse_produit_id_idx" ON "mouvements_caisse"("produit_id");

-- CreateIndex
CREATE INDEX "mouvements_caisse_lot_id_idx" ON "mouvements_caisse"("lot_id");

-- CreateIndex
CREATE INDEX "mouvements_caisse_date_idx" ON "mouvements_caisse"("date");

-- CreateIndex
CREATE INDEX "mouvements_caisse_caisse_idx" ON "mouvements_caisse"("caisse");

-- CreateIndex
CREATE INDEX "notifications_user_id_groupe_lu_idx" ON "notifications"("user_id", "groupe", "lu");

-- CreateIndex
CREATE INDEX "produits_lot_id_idx" ON "produits"("lot_id");

-- CreateIndex
CREATE INDEX "produits_modele_id_idx" ON "produits"("modele_id");

-- CreateIndex
CREATE INDEX "produits_categorie_id_idx" ON "produits"("categorie_id");

-- CreateIndex
CREATE INDEX "produits_statut_idx" ON "produits"("statut");

-- CreateIndex
CREATE INDEX "produits_en_vitrine_idx" ON "produits"("en_vitrine");

-- CreateIndex
CREATE INDEX "produits_poste_reseaux_idx" ON "produits"("poste_reseaux");

-- CreateIndex
CREATE INDEX "produits_numero_serie_idx" ON "produits"("numero_serie");

-- CreateIndex
CREATE INDEX "produits_categorie_idx" ON "produits"("categorie");

-- CreateIndex
CREATE INDEX "produits_lot_id_reference_categorie_idx" ON "produits"("lot_id", "reference", "categorie");

-- CreateIndex
CREATE INDEX "produits_parent_id_idx" ON "produits"("parent_id");

-- CreateIndex
CREATE INDEX "reparations_produit_id_idx" ON "reparations"("produit_id");

-- CreateIndex
CREATE INDEX "ventes_produit_id_idx" ON "ventes"("produit_id");

-- CreateIndex
CREATE INDEX "ventes_date_vente_idx" ON "ventes"("date_vente");

-- CreateIndex
CREATE INDEX "ventes_type_vente_idx" ON "ventes"("type_vente");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modeles" ADD CONSTRAINT "modeles_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_modele_id_fkey" FOREIGN KEY ("modele_id") REFERENCES "modeles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_images" ADD CONSTRAINT "produit_images_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_historique" ADD CONSTRAINT "composition_historique_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_historique" ADD CONSTRAINT "composition_historique_produit_parent_id_fkey" FOREIGN KEY ("produit_parent_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "composition_historique" ADD CONSTRAINT "composition_historique_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_lignes" ADD CONSTRAINT "facture_lignes_facture_id_fkey" FOREIGN KEY ("facture_id") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_activite" ADD CONSTRAINT "journal_activite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnet_entrees" ADD CONSTRAINT "carnet_entrees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnet_pieces_jointes" ADD CONSTRAINT "carnet_pieces_jointes_entree_id_fkey" FOREIGN KEY ("entree_id") REFERENCES "carnet_entrees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_cree_par_fkey" FOREIGN KEY ("cree_par") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_commande_id_fkey" FOREIGN KEY ("commande_id") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_commande" ADD CONSTRAINT "lignes_commande_modele_id_fkey" FOREIGN KEY ("modele_id") REFERENCES "modeles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
