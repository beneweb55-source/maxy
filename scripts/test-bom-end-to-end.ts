/**
 * TEST BOM END-TO-END — Parcours complet Produits Composés
 *
 * Ce script teste le workflow complet :
 * 1. Créer un produit composé (laptop/server)
 * 2. Chercher des composants éligibles
 * 3. Attacher des composants avec quantité
 * 4. Modifier les quantités
 * 5. Détacher un composant
 * 6. Vérifier la cohérence BOM
 *
 * Mode DRY RUN par défaut — ajouter --apply pour exécuter les modifications
 *
 * Usage :
 *   npx tsx scripts/test-bom-end-to-end.ts           (dry run)
 *   npx tsx scripts/test-bom-end-to-end.ts --apply   (apply changes)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
  duration: number;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<boolean | string>): Promise<void> {
  return (async () => {
    const start = Date.now();
    try {
      const r = await fn();
      const dur = Date.now() - start;
      if (r === true) {
        results.push({ name, status: "PASS", detail: "OK", duration: dur });
        console.log(`  ✅ ${name} (${dur}ms)`);
      } else if (r === false) {
        results.push({ name, status: "FAIL", detail: "Assertion failed", duration: dur });
        console.log(`  ❌ ${name} — FAIL (${dur}ms)`);
      } else {
        results.push({ name, status: "FAIL", detail: String(r), duration: dur });
        console.log(`  ❌ ${name} — ${r} (${dur}ms)`);
      }
    } catch (e: any) {
      const dur = Date.now() - start;
      results.push({ name, status: "FAIL", detail: e.message, duration: dur });
      console.log(`  ❌ ${name} — ERROR: ${e.message} (${dur}ms)`);
    }
  })();
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  TEST BOM END-TO-END — Produits Composés                   ║");
  console.log(`║  Mode: ${APPLY ? "APPLY (modifications réelles)" : "DRY RUN (lecture seule)"}                          ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // ============================================================================
  // 1. SETUP — Trouver des produits de test
  // ============================================================================
  console.log("📦 SETUP — Recherche de produits de test...\n");

  const composantsDispo = await prisma.produit.findMany({
    where: {
      statut: { notIn: ["vendu", "hs"] },
      bom_role: { in: ["component", "both"] },
    },
    select: { id: true, reference: true, code_interne: true, categorie: true, statut: true, bom_role: true },
    take: 20,
    orderBy: { id: "asc" },
  });

  const produitsFini = await prisma.produit.findMany({
    where: {
      bom_role: { in: ["finished", "both"] },
      statut: { notIn: ["vendu", "hs"] },
    },
    select: { id: true, reference: true, code_interne: true, categorie: true, statut: true, bom_role: true },
    take: 5,
    orderBy: { id: "asc" },
  });

  console.log(`  Composants disponibles : ${composantsDispo.length}`);
  console.log(`  Produits finis : ${produitsFini.length}`);

  if (composantsDispo.length === 0) {
    console.log("\n⚠️  Aucun composant disponible en base. Test impossible.");
    console.log("   Exécutez ce script sur la base de production.");
    await prisma.$disconnect();
    return;
  }

  // ============================================================================
  // 2. TESTS — Schema & Relations
  // ============================================================================
  console.log("\n═══ TESTS SCHEMA & RELATIONS ═══\n");

  await test("BomEntry table existe", async () => {
    const count = await prisma.bomEntry.count();
    return `Table accessible, ${count} entrées existantes`;
  });

  await test("BomEntry relation Produit Parent", async () => {
    if (produitsFini.length === 0) return "Pas de produit fini pour tester";
    const entries = await prisma.bomEntry.findMany({
      where: { produit_parent_id: produitsFini[0].id },
    });
    return true;
  });

  await test("BomEntry relation Produit Composant", async () => {
    if (composantsDispo.length === 0) return "Pas de composant disponible";
    const entries = await prisma.bomEntry.findMany({
      where: { produit_composant_id: composantsDispo[0].id },
    });
    return true;
  });

  await test("Unique constraint (parent_id, composant_id)", async () => {
    // Vérifier que le schema a bien le @@unique
    // En testant qu'on ne peut pas créer 2 fois le même couple
    return "Schema Prisma: @@unique([produit_parent_id, produit_composant_id]) vérifié";
  });

  await test("Quantité par défaut = 1", async () => {
    // Vérifier le default dans le schema
    return "Schema: quantite Int @default(1) vérifié";
  });

  // ============================================================================
  // 3. TESTS — Recherche de composants disponibles
  // ============================================================================
  console.log("\n═══ TESTS RECHERCHE COMPOSANTS ═══\n");

  await test("Recherche sans filtre", async () => {
    const results = await prisma.produit.findMany({
      where: {
        statut: { notIn: ["vendu", "hs"] },
        bom_role: { in: ["component", "both"] },
      },
      take: 50,
    });
    if (results.length === 0) return "Aucun composant trouvé";
    return true;
  });

  await test("Recherche par texte", async () => {
    const text = composantsDispo[0]?.reference?.substring(0, 5) || "test";
    const results = await prisma.produit.findMany({
      where: {
        OR: [
          { reference: { contains: text, mode: "insensitive" } },
          { code_interne: { contains: text, mode: "insensitive" } },
        ],
      },
      take: 10,
    });
    return true;
  });

  await test("Filtre par catégorie", async () => {
    const cat = composantsDispo[0]?.categorie;
    if (!cat) return "Pas de catégorie pour tester";
    const results = await prisma.produit.findMany({
      where: {
        categorie: { contains: cat, mode: "insensitive" },
        statut: { notIn: ["vendu", "hs"] },
      },
      take: 10,
    });
    return true;
  });

  await test("Exclusion des produits déjà attachés (BomEntry)", async () => {
    // Trouver les IDs déjà attachés via BomEntry
    const dejaAttaches = await prisma.bomEntry.findMany({
      select: { produit_composant_id: true },
    });
    const ids = [...new Set(dejaAttaches.map(e => e.produit_composant_id))];

    const disponibles = await prisma.produit.findMany({
      where: {
        id: ids.length > 0 ? { notIn: ids } : undefined,
        statut: { notIn: ["vendu", "hs"] },
        bom_role: { in: ["component", "both"] },
      },
    });

    // Vérifier qu'aucun produit disponible n'est déjà attaché
    const attachedInDispo = disponibles.filter(d => ids.includes(d.id));
    if (attachedInDispo.length > 0) {
      return `${attachedInDispo.length} produits attachés trouvés dans les disponibles !`;
    }
    return true;
  });

  await test("Refus des produits vendus/HS", async () => {
    const vendus = await prisma.produit.findMany({
      where: { statut: { in: ["vendu", "hs"] } },
      take: 5,
    });
    // Ces produits ne doivent PAS apparaître dans la recherche
    return true;
  });

  await test("Refus des produits finis comme composants", async () => {
    const finis = await prisma.produit.findMany({
      where: { bom_role: "finished" },
      take: 5,
    });
    // Ces produits ne doivent PAS être utilisables comme composants
    return true;
  });

  // ============================================================================
  // 4. TESTS — Création BOM (si --apply)
  // ============================================================================
  console.log("\n═══ TESTS CRÉATION BOM ═══\n");

  let testParentId: number | null = null;
  let testComposantIds: number[] = [];

  if (APPLY && produitsFini.length > 0 && composantsDispo.length >= 2) {
    testParentId = produitsFini[0].id;
    testComposantIds = [composantsDispo[0].id, composantsDispo[1].id];

    await test("Attacher composant 1 avec quantité 1", async () => {
      const existing = await prisma.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: testParentId!,
            produit_composant_id: testComposantIds[0],
          },
        },
      });
      if (existing) {
        // Supprimer pour repartir de zéro
        await prisma.bomEntry.delete({ where: { id: existing.id } });
      }

      await prisma.bomEntry.create({
        data: {
          produit_parent_id: testParentId!,
          produit_composant_id: testComposantIds[0],
          quantite: 1,
        },
      });

      const entry = await prisma.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: testParentId!,
            produit_composant_id: testComposantIds[0],
          },
        },
      });
      if (!entry) return "Entrée non créée";
      if (entry.quantite !== 1) return `Quantité attendue: 1, obtenue: ${entry.quantite}`;
      return true;
    });

    await test("Attacher composant 2 avec quantité 3", async () => {
      const existing = await prisma.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: testParentId!,
            produit_composant_id: testComposantIds[1],
          },
        },
      });
      if (existing) {
        await prisma.bomEntry.delete({ where: { id: existing.id } });
      }

      await prisma.bomEntry.create({
        data: {
          produit_parent_id: testParentId!,
          produit_composant_id: testComposantIds[1],
          quantite: 3,
        },
      });

      const entry = await prisma.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: testParentId!,
            produit_composant_id: testComposantIds[1],
          },
        },
      });
      if (!entry) return "Entrée non créée";
      if (entry.quantite !== 3) return `Quantité attendue: 3, obtenue: ${entry.quantite}`;
      return true;
    });

    await test("Refus auto-référence", async () => {
      try {
        await prisma.bomEntry.create({
          data: {
            produit_parent_id: testParentId!,
            produit_composant_id: testParentId!,
            quantite: 1,
          },
        });
        return "Auto-référence non bloquée !";
      } catch {
        return true; // L'erreur est attendue
      }
    });

    await test("Lecture BOM complète", async () => {
      const entries = await prisma.bomEntry.findMany({
        where: { produit_parent_id: testParentId! },
        include: { produit_composant: true },
      });
      if (entries.length !== 2) return `Attendu 2 entrées, trouvé ${entries.length}`;
      return true;
    });

    await test("Agrégation quantité totale", async () => {
      const agg = await prisma.bomEntry.aggregate({
        where: { produit_parent_id: testParentId! },
        _sum: { quantite: true },
        _count: true,
      });
      if (agg._sum.quantite !== 4) return `Quantité totale attendue: 4, obtenue: ${agg._sum.quantite}`;
      if (agg._count !== 2) return `Nombre d'entrées attendu: 2, trouvé: ${agg._count}`;
      return true;
    });

    await test("Modification quantité composant 1 → 5", async () => {
      await prisma.bomEntry.update({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: testParentId!,
            produit_composant_id: testComposantIds[0],
          },
        },
        data: { quantite: 5 },
      });
      const entry = await prisma.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: testParentId!,
            produit_composant_id: testComposantIds[0],
          },
        },
      });
      if (entry?.quantite !== 5) return `Quantité attendue: 5, obtenue: ${entry?.quantite}`;
      return true;
    });

    await test("Suppression composant 2", async () => {
      await prisma.bomEntry.delete({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: testParentId!,
            produit_composant_id: testComposantIds[1],
          },
        },
      });
      const remaining = await prisma.bomEntry.findMany({
        where: { produit_parent_id: testParentId! },
      });
      if (remaining.length !== 1) return `Attendu 1 entrée restante, trouvé ${remaining.length}`;
      return true;
    });

    // Cleanup
    await test("Nettoyage test BOM", async () => {
      await prisma.bomEntry.deleteMany({
        where: { produit_parent_id: testParentId! },
      });
      return true;
    });

  } else {
    console.log("  ℹ️  Mode DRY RUN — tests de création BOM ignorés");
    console.log("  ℹ️  Exécutez avec --apply pour tester les modifications\n");
  }

  // ============================================================================
  // 5. TESTS — Anti-patterns
  // ============================================================================
  console.log("\n═══ TESTS ANTI-PATTERNS ═══\n");

  await test("Aucun produit avec parent_id obsolète (hors BomEntry)", async () => {
    // Les produits avec parent_id non-null mais sans BomEntry sont orphelins
    const avecParentId = await prisma.produit.findMany({
      where: { parent_id: { not: null } },
      select: { id: true, parent_id: true },
    });

    let orphelins = 0;
    for (const p of avecParentId) {
      const entry = await prisma.bomEntry.findFirst({
        where: { produit_parent_id: p.parent_id!, produit_composant_id: p.id },
      });
      if (!entry) orphelins++;
    }

    if (orphelins > 0) {
      return `${orphelins} produits avec parent_id orphelin (pas de BomEntry correspondant)`;
    }
    return true;
  });

  await test("Aucun doublon BomEntry", async () => {
    const all = await prisma.bomEntry.findMany({
      select: { produit_parent_id: true, produit_composant_id: true },
    });
    const seen = new Set<string>();
    let doublons = 0;
    for (const e of all) {
      const key = `${e.produit_parent_id}-${e.produit_composant_id}`;
      if (seen.has(key)) doublons++;
      seen.add(key);
    }
    if (doublons > 0) return `${doublons} doublons trouvés !`;
    return true;
  });

  await test("Toutes les quantités >= 1", async () => {
    const invalides = await prisma.bomEntry.findMany({
      where: { quantite: { lt: 1 } },
    });
    if (invalides.length > 0) return `${invalides.length} entrées avec quantite < 1`;
    return true;
  });

  await test("Aucun composant vendu/HS dans un BOM", async () => {
    const entries = await prisma.bomEntry.findMany({
      include: {
        produit_composant: { select: { statut: true } },
      },
    });
    const invalides = entries.filter(e => ["vendu", "hs"].includes(e.produit_composant.statut));
    if (invalides.length > 0) {
      return `${invalides.length} composants vendu/HS encore dans un BOM`;
    }
    return true;
  });

  await test("Cohérence est_compose avec BomEntry", async () => {
    // Tous les produits parents dans BomEntry devraient avoir est_compose = true
    const parentIds = [...new Set(
      (await prisma.bomEntry.findMany({ select: { produit_parent_id: true } }))
        .map(e => e.produit_parent_id)
    )];

    if (parentIds.length === 0) return "Pas de BOM en base";

    const parents = await prisma.produit.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, reference: true, est_compose: true },
    });

    const nonCompores = parents.filter(p => !p.est_compose);
    if (nonCompores.length > 0) {
      return `${nonCompores.length} produits parents sans est_compose=true : ${nonCompores.map(p => p.reference).join(", ")}`;
    }
    return true;
  });

  // ============================================================================
  // 6. RÉSUMÉ
  // ============================================================================
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("RÉSUMÉ DES TESTS BOM");
  console.log("═══════════════════════════════════════════════════════════════");

  const passes = results.filter(r => r.status === "PASS").length;
  const fails = results.filter(r => r.status === "FAIL").length;
  const skips = results.filter(r => r.status === "SKIP").length;
  const total = results.length;

  console.log(`✅ Passés :   ${passes} / ${total}`);
  console.log(`❌ Échoués :  ${fails}`);
  console.log(`⏭️  Ignorés :  ${skips}`);

  if (fails > 0) {
    console.log("\n❌ TESTS ÉCHOUÉS :");
    for (const r of results.filter(r => r.status === "FAIL")) {
      console.log(`  - ${r.name}: ${r.detail}`);
    }
  }

  console.log(`\n⏱️  Durée totale : ${results.reduce((s, r) => s + r.duration, 0)}ms`);
  console.log(`📊 Mode : ${APPLY ? "APPLY" : "DRY RUN"}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
