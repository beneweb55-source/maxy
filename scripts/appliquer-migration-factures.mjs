// Applique (idempotent) puis VÉRIFIE la migration « factures & garantie ».
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "factures" (
     "id" SERIAL NOT NULL,
     "numero" TEXT NOT NULL,
     "date_emission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "client_nom" TEXT,
     "client_tel" TEXT,
     "total" INTEGER NOT NULL,
     "garantie_mois" INTEGER NOT NULL DEFAULT 6,
     "garantie_fin" TIMESTAMP(3) NOT NULL,
     "canal" TEXT,
     "groupe_vente" TEXT,
     "cree_par" INTEGER NOT NULL,
     "annulee" BOOLEAN NOT NULL DEFAULT false,
     CONSTRAINT "factures_pkey" PRIMARY KEY ("id"))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "factures_numero_key" ON "factures" ("numero")`,
  `CREATE INDEX IF NOT EXISTS "factures_date_emission_idx" ON "factures" ("date_emission")`,
  `CREATE TABLE IF NOT EXISTS "facture_lignes" (
     "id" SERIAL NOT NULL,
     "facture_id" INTEGER NOT NULL,
     "produit_id" INTEGER,
     "vente_id" INTEGER,
     "code_interne" TEXT NOT NULL,
     "designation" TEXT NOT NULL,
     "categorie" TEXT,
     "prix" INTEGER NOT NULL,
     "garantie_fin" TIMESTAMP(3) NOT NULL,
     CONSTRAINT "facture_lignes_pkey" PRIMARY KEY ("id"))`,
  `CREATE INDEX IF NOT EXISTS "facture_lignes_facture_id_idx" ON "facture_lignes" ("facture_id")`,
  `DO $$ BEGIN
     ALTER TABLE "factures" ADD CONSTRAINT "factures_cree_par_fkey"
     FOREIGN KEY ("cree_par") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
     ALTER TABLE "facture_lignes" ADD CONSTRAINT "facture_lignes_facture_id_fkey"
     FOREIGN KEY ("facture_id") REFERENCES "factures" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
];

let ok = false;
for (let t = 1; t <= 8 && !ok; t++) {
  try {
    for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
    ok = true;
    console.log(`Tentative ${t} : migration appliquée.`);
  } catch (e) {
    const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    console.error(`Tentative ${t} : ${m}`);
    if (t < 8) await attendre(5000);
  }
}
if (!ok) process.exit(1);

const tables = await prisma.$queryRawUnsafe(
  `SELECT to_regclass('public.factures')::text AS f, to_regclass('public.facture_lignes')::text AS l`
);
console.log("Tables :", JSON.stringify(tables));

// Preuve : la requête générée par le client Prisma (celle des pages) passe.
const nb = await prisma.facture.count();
console.log(`Requête client Prisma OK — ${nb} facture(s) en base.`);

const valide = Array.isArray(tables) && tables[0]?.f === "factures" && tables[0]?.l === "facture_lignes";
console.log(valide ? "MIGRATION VÉRIFIÉE ✅" : "MIGRATION INCOMPLÈTE ❌");
await prisma.$disconnect();
process.exit(valide ? 0 : 1);
