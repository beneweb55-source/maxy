// Applique TOUTES les migrations en attente (idempotent) puis les vérifie.
// À lancer dès que la base répond :  node scripts/migrer-tout.mjs
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const ETAPES = [
  // 1) Vitrine + photos multiples
  `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "en_vitrine" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS "produit_images" (
     "id" SERIAL NOT NULL, "produit_id" INTEGER NOT NULL, "data" TEXT NOT NULL,
     "position" INTEGER NOT NULL DEFAULT 0,
     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT "produit_images_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "produit_images_produit_id_idx" ON "produit_images" ("produit_id")`,
  `DO $$ BEGIN ALTER TABLE "produit_images" ADD CONSTRAINT "produit_images_produit_id_fkey"
     FOREIGN KEY ("produit_id") REFERENCES "produits" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // 2) Produit sans arrivage
  `ALTER TABLE "produits" ALTER COLUMN "lot_id" DROP NOT NULL`,
  `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,

  // 3) Factures & garantie
  `CREATE TABLE IF NOT EXISTS "factures" (
     "id" SERIAL NOT NULL, "numero" TEXT NOT NULL,
     "date_emission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "client_nom" TEXT, "client_tel" TEXT, "total" INTEGER NOT NULL,
     "garantie_mois" INTEGER NOT NULL DEFAULT 6, "garantie_fin" TIMESTAMP(3) NOT NULL,
     "canal" TEXT, "groupe_vente" TEXT, "cree_par" INTEGER NOT NULL,
     "annulee" BOOLEAN NOT NULL DEFAULT false,
     CONSTRAINT "factures_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "factures_numero_key" ON "factures" ("numero")`,
  `CREATE INDEX IF NOT EXISTS "factures_date_emission_idx" ON "factures" ("date_emission")`,
  `CREATE TABLE IF NOT EXISTS "facture_lignes" (
     "id" SERIAL NOT NULL, "facture_id" INTEGER NOT NULL, "produit_id" INTEGER,
     "vente_id" INTEGER, "code_interne" TEXT NOT NULL, "designation" TEXT NOT NULL,
     "categorie" TEXT, "prix" INTEGER NOT NULL, "garantie_fin" TIMESTAMP(3) NOT NULL,
     CONSTRAINT "facture_lignes_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "facture_lignes_facture_id_idx" ON "facture_lignes" ("facture_id")`,
  `DO $$ BEGIN ALTER TABLE "factures" ADD CONSTRAINT "factures_cree_par_fkey"
     FOREIGN KEY ("cree_par") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN ALTER TABLE "facture_lignes" ADD CONSTRAINT "facture_lignes_facture_id_fkey"
     FOREIGN KEY ("facture_id") REFERENCES "factures" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

let ok = false;
for (let t = 1; t <= 10 && !ok; t++) {
  try {
    for (const sql of ETAPES) await prisma.$executeRawUnsafe(sql);
    ok = true;
    console.log(`Tentative ${t} : toutes les migrations appliquées.`);
  } catch (e) {
    const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    console.error(`Tentative ${t} : ${m}`);
    if (t < 10) await attendre(6000);
  }
}
if (!ok) {
  console.error("\nÉCHEC : la base reste injoignable (quota de transfert Neon ?).");
  process.exit(1);
}

const etat = await prisma.$queryRawUnsafe(`
  SELECT
    (SELECT is_nullable FROM information_schema.columns
      WHERE table_name='produits' AND column_name='lot_id') AS lot_nullable,
    (SELECT count(*) FROM information_schema.columns
      WHERE table_name='produits' AND column_name IN ('created_at','en_vitrine')) AS colonnes_produit,
    to_regclass('public.produit_images')::text AS t_images,
    to_regclass('public.factures')::text AS t_factures,
    to_regclass('public.facture_lignes')::text AS t_lignes
`);
console.log("État :", JSON.stringify(etat, null, 2));

const r = etat[0];
const valide =
  r?.lot_nullable === "YES" &&
  Number(r?.colonnes_produit) === 2 &&
  r?.t_images === "produit_images" &&
  r?.t_factures === "factures" &&
  r?.t_lignes === "facture_lignes";
console.log(valide ? "\nTOUTES LES MIGRATIONS VÉRIFIÉES ✅" : "\nMIGRATIONS INCOMPLÈTES ❌");
await prisma.$disconnect();
process.exit(valide ? 0 : 1);
