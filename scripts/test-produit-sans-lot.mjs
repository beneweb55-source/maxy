// Vérifie qu'un produit SANS lot (lot_id null) peut être créé et relu avec la
// même forme de requête que les pages. Transaction ANNULÉE : rien ne persiste.
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
const prisma = new PrismaClient({ datasourceUrl: url });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function reessais(fn) {
  for (let t = 1; t <= 6; t++) {
    try { return await fn(); }
    catch (e) {
      const m = e instanceof Error ? e.message.split("\n").filter(Boolean).at(-1) : String(e);
      if (m.includes("ROLLBACK_TEST")) throw e;
      console.error(`Tentative ${t}: ${m}`);
      if (t === 6) throw e;
      await attendre(4000);
    }
  }
}

try {
  await reessais(() =>
    prisma.$transaction(async (tx) => {
      const dernier = await tx.produit.findFirst({ orderBy: { id: "desc" }, select: { code_interne: true } });
      let num = dernier ? Number.parseInt(dernier.code_interne.replace(/\D/g, ""), 10) || 0 : 0;
      const [cree] = await tx.produit.createManyAndReturn({
        data: [{
          lot_id: null,
          code_interne: `ZZNOLOT-${String(++num).padStart(6, "0")}`,
          reference: "TEST SANS LOT",
          categorie: "TEST",
          prix_achat: 1,
          en_vitrine: true,
        }],
        select: { id: true },
      });
      // Relit avec la MÊME forme que GET /api/produits/[id].
      const p = await tx.produit.findUnique({
        where: { id: cree.id },
        include: { lot: { select: { id: true, fournisseur: true, date_entree: true, statut_lot: true } } },
      });
      const dateEntree = (p.lot?.date_entree ?? p.created_at).toISOString();
      console.log("Produit sans lot créé :", {
        id: p.id, lot_id: p.lot_id, lot: p.lot, en_vitrine: p.en_vitrine,
        created_at: p.created_at.toISOString(), date_entree_calculee: dateEntree,
      });
      if (p.lot_id !== null) throw new Error("lot_id devrait être null");
      if (p.lot !== null) throw new Error("lot devrait être null");
      console.log("Lecture avec lot null OK ✅");
      throw new Error("ROLLBACK_TEST");
    }, { timeout: 60000 })
  );
} catch (e) {
  if (!(e instanceof Error) || !e.message.includes("ROLLBACK_TEST")) {
    console.error("ÉCHEC:", e); process.exit(1);
  }
  console.log("Transaction annulée — aucune donnée créée. ✅");
}

const restant = await reessais(() => prisma.produit.count({ where: { code_interne: { startsWith: "ZZNOLOT-" } } }));
console.log("Produits ZZNOLOT- restants :", restant, restant === 0 ? "✅" : "❌");
await prisma.$disconnect();
process.exit(restant === 0 ? 0 : 1);
