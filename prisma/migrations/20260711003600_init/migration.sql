-- CreateEnum
CREATE TYPE "Role" AS ENUM ('gerant', 'technicien', 'dev');

-- CreateEnum
CREATE TYPE "StatutLot" AS ENUM ('en_cours_de_test', 'teste', 'valide');

-- CreateEnum
CREATE TYPE "StatutProduit" AS ENUM ('recu', 'en_test', 'ok', 'a_reparer', 'manque_piece', 'hs', 'en_vente', 'vendu');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('achat_lot', 'vente', 'annulation_vente', 'apport_associe', 'achat_piece', 'frais', 'retrait_parts', 'transfert_reserve', 'reinvest');

-- CreateEnum
CREATE TYPE "DecisionRapport" AS ENUM ('reparer', 'vendre_en_etat', 'pieces_detachees');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "marge_minimum_pct" INTEGER NOT NULL DEFAULT 20,
    "objectif_reserve" INTEGER NOT NULL DEFAULT 50000,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" SERIAL NOT NULL,
    "fournisseur" TEXT NOT NULL,
    "date_entree" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut_lot" "StatutLot" NOT NULL DEFAULT 'en_cours_de_test',
    "description" TEXT,
    "cout_global_declare" INTEGER,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produits" (
    "id" SERIAL NOT NULL,
    "lot_id" INTEGER NOT NULL,
    "code_interne" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "statut" "StatutProduit" NOT NULL DEFAULT 'recu',
    "prix_achat" INTEGER NOT NULL,
    "prix_vente_fixe" INTEGER,
    "prix_vente_reel" INTEGER,
    "date_vente" TIMESTAMP(3),
    "notes" TEXT,
    "decision_rapport" "DecisionRapport",

    CONSTRAINT "produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventes" (
    "id" SERIAL NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "vendu_par" INTEGER NOT NULL,
    "prix_vente_reel" INTEGER NOT NULL,
    "canal" TEXT,
    "date_vente" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annulee" BOOLEAN NOT NULL DEFAULT false,
    "motif_annulation" TEXT,
    "annulee_par" INTEGER,
    "annulee_at" TIMESTAMP(3),

    CONSTRAINT "ventes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reparations" (
    "id" SERIAL NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "cout" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reparations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_statuts" (
    "id" SERIAL NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "statut_avant" "StatutProduit",
    "statut_apres" "StatutProduit" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_statuts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_caisse" (
    "id" SERIAL NOT NULL,
    "montant" INTEGER NOT NULL,
    "type" "TypeMouvement" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "produit_id" INTEGER,
    "lot_id" INTEGER,
    "user_id" INTEGER NOT NULL,
    "description" TEXT,
    "solde_apres" INTEGER NOT NULL,

    CONSTRAINT "mouvements_caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "lien" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "produits_code_interne_key" ON "produits"("code_interne");

-- AddForeignKey
ALTER TABLE "produits" ADD CONSTRAINT "produits_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventes" ADD CONSTRAINT "ventes_vendu_par_fkey" FOREIGN KEY ("vendu_par") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparations" ADD CONSTRAINT "reparations_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reparations" ADD CONSTRAINT "reparations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_statuts" ADD CONSTRAINT "historique_statuts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_caisse" ADD CONSTRAINT "mouvements_caisse_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "produits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_caisse" ADD CONSTRAINT "mouvements_caisse_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_caisse" ADD CONSTRAINT "mouvements_caisse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
