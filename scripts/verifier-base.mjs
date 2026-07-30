// Test de connectivité immédiat (une seule tentative) : permet de savoir en 2
// secondes si la base répond de nouveau, avant de lancer les migrations.
//
//   node scripts/verifier-base.mjs
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
if (!url) {
  console.error("DATABASE_URL introuvable dans .env");
  process.exit(1);
}
const prisma = new PrismaClient({ datasourceUrl: url });

try {
  const debut = Date.now();
  const nb = await prisma.produit.count();
  console.log(`BASE ACCESSIBLE ✅  (${nb} produits, ${Date.now() - debut} ms)`);
  console.log("\nVous pouvez lancer, dans cet ordre :");
  console.log("  node scripts/migrer-tout.mjs");
  console.log("  node scripts/migrer-photos-vers-blob.mjs            (à blanc)");
  console.log("  node scripts/migrer-photos-vers-blob.mjs --appliquer");
  process.exit(0);
} catch (e) {
  const message = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
  if (/data transfer quota/i.test(message)) {
    console.log("BASE BLOQUÉE ❌ — quota de transfert Neon toujours épuisé.");
    console.log("Rien à faire côté code : attendez la réinitialisation ou changez de plan.");
  } else if (/reach|running/i.test(message)) {
    console.log("BASE INJOIGNABLE ❌ — réseau ou instance en veille. Réessayez.");
  } else {
    console.log(`BASE EN ERREUR ❌ — ${message}`);
  }
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
