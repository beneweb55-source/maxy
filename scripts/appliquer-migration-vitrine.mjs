// Applique (idempotent) puis VÉRIFIE la migration « vitrine + photos multiples »
// sur la base pointée par DATABASE_URL du .env. Réessaie en cas de réseau
// intermittent (Neon). Sortie explicite : impossible de confondre avec un
// faux succès silencieux.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const m = /^DATABASE_URL=(.+)$/m.exec(env);
if (!m) {
  console.error("DATABASE_URL introuvable dans .env");
  process.exit(1);
}
const url = m[1].trim();
console.log("Base ciblée :", url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@"));

const prisma = new PrismaClient({ datasourceUrl: url });

const STATEMENTS = [
  `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "en_vitrine" BOOLEAN NOT NULL DEFAULT false`,
  `CREATE TABLE IF NOT EXISTS "produit_images" (
    "id"         SERIAL       NOT NULL,
    "produit_id" INTEGER      NOT NULL,
    "data"       TEXT         NOT NULL,
    "position"   INTEGER      NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "produit_images_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "produit_images_produit_id_idx" ON "produit_images" ("produit_id")`,
  `DO $$
   BEGIN
     ALTER TABLE "produit_images"
       ADD CONSTRAINT "produit_images_produit_id_fkey"
       FOREIGN KEY ("produit_id") REFERENCES "produits" ("id")
       ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END
   $$`,
];

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

let appliquee = false;
for (let tentative = 1; tentative <= 6 && !appliquee; tentative++) {
  try {
    for (const sql of STATEMENTS) {
      await prisma.$executeRawUnsafe(sql);
    }
    appliquee = true;
    console.log(`Tentative ${tentative} : migration appliquée.`);
  } catch (e) {
    const message = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    console.error(`Tentative ${tentative} échouée : ${message}`);
    if (tentative < 6) await attendre(5000);
  }
}
if (!appliquee) {
  console.error("ÉCHEC : migration non appliquée après 6 tentatives.");
  process.exit(1);
}

// Vérification réelle, avec résultats affichés.
const colonne = await prisma.$queryRawUnsafe(
  `SELECT column_name FROM information_schema.columns
   WHERE table_name = 'produits' AND column_name = 'en_vitrine'`
);
const table = await prisma.$queryRawUnsafe(
  `SELECT to_regclass('public.produit_images')::text AS t`
);
console.log("Colonne en_vitrine :", JSON.stringify(colonne));
console.log("Table produit_images :", JSON.stringify(table));

// Preuve ultime : la requête générée par le client Prisma (celle des pages) passe.
const echantillon = await prisma.produit.findFirst({
  select: { id: true, code_interne: true, en_vitrine: true },
});
const nb = await prisma.produit.count();
console.log(`Requête client Prisma OK — ${nb} produits, échantillon :`, echantillon);

const ok =
  Array.isArray(colonne) && colonne.length === 1 &&
  Array.isArray(table) && table[0]?.t === "produit_images";
console.log(ok ? "MIGRATION VÉRIFIÉE ✅" : "MIGRATION INCOMPLÈTE ❌");
await prisma.$disconnect();
process.exit(ok ? 0 : 1);
