/*
  Migration safe : aucune donnée n'est supprimée.
  La table bom_entries est conservée par précaution même si elle n'est plus référencée par le schéma Prisma.
*/
-- CreateEnum
CREATE TYPE "StatutCredit" AS ENUM ('paye', 'partiellement_paye', 'impaye', 'en_retard');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('especes', 'virement', 'carte', 'cheque', 'autre');

-- CreateEnum
CREATE TYPE "CategorieCharge" AS ENUM ('loyer', 'electricite', 'internet', 'telephone', 'salaires', 'transport', 'carburant', 'fournitures', 'maintenance', 'marketing', 'logiciels', 'taxes', 'bancaires', 'autre');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeDocument" ADD VALUE 'BON_LIVRAISON';
ALTER TYPE "TypeDocument" ADD VALUE 'BON_ACHAT';

-- CreateTable
CREATE TABLE "vente_credits" (
    "id" SERIAL NOT NULL,
    "vente_id" INTEGER NOT NULL,
    "client_id" INTEGER NOT NULL,
    "montant_total" INTEGER NOT NULL,
    "montant_paye" INTEGER NOT NULL DEFAULT 0,
    "montant_restant" INTEGER NOT NULL,
    "statut" "StatutCredit" NOT NULL DEFAULT 'impaye',
    "date_vente" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_echeance" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vente_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiement_credits" (
    "id" SERIAL NOT NULL,
    "credit_id" INTEGER NOT NULL,
    "montant" INTEGER NOT NULL,
    "mode_paiement" "ModePaiement" NOT NULL DEFAULT 'especes',
    "reference" TEXT,
    "notes" TEXT,
    "user_id" INTEGER NOT NULL,
    "date_paiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiement_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charges" (
    "id" SERIAL NOT NULL,
    "categorie" "CategorieCharge" NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "montant" INTEGER NOT NULL,
    "date_charge" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode_paiement" "ModePaiement" NOT NULL DEFAULT 'especes',
    "beneficiaire" TEXT,
    "reference" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'paye',
    "user_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vente_credits_vente_id_key" ON "vente_credits"("vente_id");

-- CreateIndex
CREATE INDEX "vente_credits_client_id_idx" ON "vente_credits"("client_id");

-- CreateIndex
CREATE INDEX "vente_credits_statut_idx" ON "vente_credits"("statut");

-- CreateIndex
CREATE INDEX "vente_credits_date_echeance_idx" ON "vente_credits"("date_echeance");

-- CreateIndex
CREATE INDEX "vente_credits_created_at_idx" ON "vente_credits"("created_at");

-- CreateIndex
CREATE INDEX "paiement_credits_credit_id_idx" ON "paiement_credits"("credit_id");

-- CreateIndex
CREATE INDEX "paiement_credits_date_paiement_idx" ON "paiement_credits"("date_paiement");

-- CreateIndex
CREATE INDEX "charges_categorie_idx" ON "charges"("categorie");

-- CreateIndex
CREATE INDEX "charges_date_charge_idx" ON "charges"("date_charge");

-- CreateIndex
CREATE INDEX "charges_statut_idx" ON "charges"("statut");

-- CreateIndex
CREATE INDEX "charges_created_at_idx" ON "charges"("created_at");

-- AddForeignKey
ALTER TABLE "vente_credits" ADD CONSTRAINT "vente_credits_vente_id_fkey" FOREIGN KEY ("vente_id") REFERENCES "ventes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vente_credits" ADD CONSTRAINT "vente_credits_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement_credits" ADD CONSTRAINT "paiement_credits_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "vente_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiement_credits" ADD CONSTRAINT "paiement_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charges" ADD CONSTRAINT "charges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
