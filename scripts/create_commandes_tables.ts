import { prisma } from "../lib/db";

async function main() {
  console.log("Creation des tables commandes si inexistantes...");

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "StatutCommande" AS ENUM ('devis', 'en_attente', 'payee', 'annulee', 'remboursee');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "TypePaiement" AS ENUM ('especes', 'virement', 'carte', 'cheque');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "clients" (
      "id" SERIAL PRIMARY KEY,
      "nom" TEXT NOT NULL,
      "telephone" TEXT,
      "email" TEXT,
      "adresse" TEXT,
      "registre_commerce" TEXT,
      "nif" TEXT,
      "nis" TEXT,
      "article_imposition" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "commandes" (
      "id" SERIAL PRIMARY KEY,
      "numero" TEXT NOT NULL UNIQUE,
      "date_commande" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "statut" "StatutCommande" NOT NULL DEFAULT 'payee',
      "type_paiement" "TypePaiement" NOT NULL DEFAULT 'especes',
      "client_id" INTEGER REFERENCES "clients"("id") ON DELETE SET NULL,
      "client_nom" TEXT,
      "client_tel" TEXT,
      "client_adresse" TEXT,
      "total_ht" INTEGER NOT NULL,
      "total_tva" INTEGER NOT NULL DEFAULT 0,
      "total_ttc" INTEGER NOT NULL,
      "remise_globale" INTEGER NOT NULL DEFAULT 0,
      "garantie_mois" INTEGER NOT NULL DEFAULT 6,
      "garantie_fin" TIMESTAMP(3) NOT NULL,
      "notes" TEXT,
      "cree_par" INTEGER NOT NULL REFERENCES "users"("id"),
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "lignes_commande" (
      "id" SERIAL PRIMARY KEY,
      "commande_id" INTEGER NOT NULL REFERENCES "commandes"("id") ON DELETE CASCADE,
      "produit_id" INTEGER REFERENCES "produits"("id") ON DELETE SET NULL,
      "modele_id" INTEGER REFERENCES "modeles"("id") ON DELETE SET NULL,
      "code_interne" TEXT NOT NULL,
      "designation" TEXT NOT NULL,
      "numero_serie" TEXT,
      "categorie" TEXT,
      "quantite" INTEGER NOT NULL DEFAULT 1,
      "prix_unitaire" INTEGER NOT NULL,
      "remise_ligne" INTEGER NOT NULL DEFAULT 0,
      "total_ligne" INTEGER NOT NULL,
      "mode_ajout" TEXT DEFAULT 'scan',
      "etiquette_imprimee" BOOLEAN NOT NULL DEFAULT false
    );
  `);

  console.log("✅ Tables et énumérations créées avec succès !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
