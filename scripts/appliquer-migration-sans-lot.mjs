// Applique (idempotent) puis VÉRIFIE la migration « produit sans lot ».
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const STATEMENTS = [
  `ALTER TABLE "produits" ALTER COLUMN "lot_id" DROP NOT NULL`,
  `ALTER TABLE "produits" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
  `UPDATE "produits" p SET "created_at" = COALESCE(
     (SELECT MIN(h."created_at") FROM "historique_statuts" h WHERE h."produit_id" = p."id"),
     (SELECT l."date_entree" FROM "lots" l WHERE l."id" = p."lot_id"),
     p."created_at")`,
];

let ok = false;
for (let t = 1; t <= 6 && !ok; t++) {
  try {
    for (const sql of STATEMENTS) await prisma.$executeRawUnsafe(sql);
    ok = true;
    console.log(`Tentative ${t} : migration appliquée.`);
  } catch (e) {
    const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
    console.error(`Tentative ${t} : ${m}`);
    if (t < 6) await attendre(5000);
  }
}
if (!ok) process.exit(1);

// Vérifications réelles.
const nullable = await prisma.$queryRawUnsafe(
  `SELECT is_nullable FROM information_schema.columns WHERE table_name='produits' AND column_name='lot_id'`
);
const col = await prisma.$queryRawUnsafe(
  `SELECT column_name FROM information_schema.columns WHERE table_name='produits' AND column_name='created_at'`
);
console.log("lot_id is_nullable :", JSON.stringify(nullable));
console.log("created_at présent :", JSON.stringify(col));

// Preuve : la requête client Prisma (celle des pages) passe avec created_at.
const echantillon = await prisma.produit.findFirst({
  select: { id: true, lot_id: true, created_at: true },
});
console.log("Requête client Prisma OK :", echantillon);

const valide =
  Array.isArray(nullable) && nullable[0]?.is_nullable === "YES" &&
  Array.isArray(col) && col.length === 1;
console.log(valide ? "MIGRATION VÉRIFIÉE ✅" : "MIGRATION INCOMPLÈTE ❌");
await prisma.$disconnect();
process.exit(valide ? 0 : 1);
