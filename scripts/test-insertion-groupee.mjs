// Vérifie que l'insertion groupée (createManyAndReturn + createMany) fonctionne
// sur la base et est rapide pour une grande quantité — le tout dans une
// transaction VOLONTAIREMENT ANNULÉE (throw final) : AUCUNE donnée n'est créée.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function avecReessais(fn) {
  for (let t = 1; t <= 6; t++) {
    try {
      return await fn();
    } catch (e) {
      const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
      if (m.includes("ROLLBACK_TEST")) throw e; // notre annulation volontaire
      console.error(`Tentative ${t} : ${m}`);
      if (t === 6) throw e;
      await attendre(4000);
    }
  }
}

const lot = await avecReessais(() => prisma.lot.findFirst({ select: { id: true } }));
if (!lot) {
  console.log("Aucun lot en base — test ignoré (mais le code est valide).");
  process.exit(0);
}
console.log("Lot de test:", lot.id, "(rien ne sera créé, transaction annulée)");

const N = 60;
const t0 = Date.now();
try {
  await avecReessais(() =>
    prisma.$transaction(
      async (tx) => {
        const dernier = await tx.produit.findFirst({ orderBy: { id: "desc" }, select: { code_interne: true } });
        let num = dernier ? Number.parseInt(dernier.code_interne.replace(/\D/g, ""), 10) || 0 : 0;
        const codes = Array.from({ length: N }, () => `ZZTEST-${String(++num).padStart(6, "0")}`);
        const crees = await tx.produit.createManyAndReturn({
          data: codes.map((code) => ({
            lot_id: lot.id,
            code_interne: code,
            reference: "TEST INSERTION GROUPEE",
            categorie: "TEST",
            prix_achat: 1,
          })),
          select: { id: true, code_interne: true },
        });
        await tx.historiqueStatut.createMany({
          data: crees.map((p) => ({ produit_id: p.id, user_id: 1, statut_avant: null, statut_apres: "recu" })),
        });
        console.log(`createManyAndReturn OK : ${crees.length} produits + historique en ${Date.now() - t0} ms`);
        // Annulation : rien ne persiste.
        throw new Error("ROLLBACK_TEST");
      },
      { timeout: 120000 }
    )
  );
} catch (e) {
  if (!(e instanceof Error) || !e.message.includes("ROLLBACK_TEST")) {
    console.error("ÉCHEC:", e);
    process.exit(1);
  }
  console.log(`Transaction annulée (rollback) — total ${Date.now() - t0} ms. AUCUNE donnée créée. ✅`);
}

// Confirme qu'aucun produit de test ne subsiste.
const restant = await avecReessais(() => prisma.produit.count({ where: { code_interne: { startsWith: "ZZTEST-" } } }));
console.log("Produits ZZTEST- restants en base:", restant, restant === 0 ? "✅" : "❌ À NETTOYER");
await prisma.$disconnect();
process.exit(restant === 0 ? 0 : 1);
