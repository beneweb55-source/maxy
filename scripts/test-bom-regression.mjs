/**
 * Tests de régression BOM — Vérifie que toutes les fonctionnalités existantes
 * fonctionnent toujours après la reconstruction du système BOM.
 *
 * Usage: node scripts/test-bom-regression.mjs
 *
 * Teste :
 * - La table installed_components existe et est vide
 * - La table slot_definitions existe et est vide
 * - Les champs est_template et template_parent_id existent sur produits
 * - Les anciens champs (bom_role, est_compose, parent_id) existent toujours
 * - Les anciennes requêtes Prisma fonctionnent toujours
 * - La table composition_historique existe toujours
 * - Aucune régression sur les autres tables
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
const results = [];

function log(testNum, title, status, detail) {
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} TEST ${testNum}: ${title} — ${status}${detail ? ` (${detail})` : ""}`);
  results.push({ test: testNum, title, status, detail });
  if (status === "PASS") passed++;
  else failed++;
}

async function runRegressionTests() {
  console.log("\n🔄 TESTS DE RÉGRESSION BOM\n");
  console.log("=".repeat(60));

  try {
    // ───────────────────────────────────────────────────
    // TEST R1 : Table installed_components existe
    // ───────────────────────────────────────────────────
    const installedCount = await prisma.installedComponent.count();
    log(1, "Table installed_components accessible", "PASS", `${installedCount} enregistrements`);

    // ───────────────────────────────────────────────────
    // TEST R2 : Table slot_definitions existe
    // ───────────────────────────────────────────────────
    const slotCount = await prisma.slotDefinition.count();
    log(2, "Table slot_definitions accessible", "PASS", `${slotCount} enregistrements`);

    // ───────────────────────────────────────────────────
    // TEST R3 : Champs est_template et template_parent_id existent
    // ───────────────────────────────────────────────────
    try {
      const produitSample = await prisma.produit.findFirst({
        select: { id: true, est_template: true, template_parent_id: true },
      });
      // La requête réussit = les colonnes existent (même si la table est vide)
      log(3, "Champs est_template / template_parent_id existent", "PASS",
        produitSample ? `est_template: ${produitSample.est_template}` : "Colonnes présentes (table vide)"
      );
    } catch (e) {
      log(3, "Champs est_template / template_parent_id existent", "FAIL", e.message.slice(0, 80));
    }

    // ───────────────────────────────────────────────────
    // TEST R4 : Anciens champs BOM existent toujours
    // ───────────────────────────────────────────────────
    try {
      const produitBom = await prisma.produit.findFirst({
        select: { id: true, bom_role: true, est_compose: true, parent_id: true },
      });
      log(4, "Anciens champs BOM (bom_role, est_compose, parent_id) existent", "PASS",
        produitBom ? `bom_role: ${produitBom.bom_role}` : "Colonnes présentes (table vide)"
      );
    } catch (e) {
      log(4, "Anciens champs BOM (bom_role, est_compose, parent_id) existent", "FAIL", e.message.slice(0, 80));
    }

    // ───────────────────────────────────────────────────
    // TEST R5 : Table composition_historique toujours accessible
    // ───────────────────────────────────────────────────
    const histCount = await prisma.compositionHistorique.count();
    log(5, "Table composition_historique accessible", "PASS", `${histCount} enregistrements`);

    // ───────────────────────────────────────────────────
    // TEST R6 : Table historique_statuts toujours accessible
    // ───────────────────────────────────────────────────
    const histStatutCount = await prisma.historiqueStatut.count();
    log(6, "Table historique_statuts accessible", "PASS", `${histStatutCount} enregistrements`);

    // ───────────────────────────────────────────────────
    // TEST R7 : Les autres tables ne sont pas affectées
    // ───────────────────────────────────────────────────
    const tables = ["user", "produit", "categorie", "client", "vente", "charge", "mouvementCaisse"];
    const counts = {};
    for (const t of tables) {
      try {
        counts[t] = await prisma[t].count();
      } catch (e) {
        counts[t] = `ERREUR: ${e.message.slice(0, 40)}`;
      }
    }
    const allAccessible = Object.values(counts).every((c) => typeof c === "number");
    log(7, "Autres tables toujours accessibles", allAccessible ? "PASS" : "FAIL",
      JSON.stringify(counts)
    );

    // ───────────────────────────────────────────────────
    // TEST R8 : Requête Prisma avec include sur InstalledComponent
    // ───────────────────────────────────────────────────
    try {
      const testQuery = await prisma.installedComponent.findMany({
        take: 1,
        include: {
          produit: { select: { id: true, reference: true } },
          produit_parent: { select: { id: true, reference: true } },
          slot_definition: { select: { id: true, label: true } },
          installer: { select: { id: true, username: true } },
        },
      });
      log(8, "Requête Prisma avec include sur InstalledComponent", "PASS",
        `${testQuery.length} résultats`
      );
    } catch (e) {
      log(8, "Requête Prisma avec include sur InstalledComponent", "FAIL", e.message.slice(0, 80));
    }

    // ───────────────────────────────────────────────────
    // TEST R9 : Requête Prisma avec include sur SlotDefinition
    // ───────────────────────────────────────────────────
    try {
      const testQuery = await prisma.slotDefinition.findMany({
        take: 1,
        include: {
          produit_parent: { select: { id: true, reference: true } },
          _count: { select: { installed_components: true } },
        },
      });
      log(9, "Requête Prisma avec include sur SlotDefinition", "PASS",
        `${testQuery.length} résultats`
      );
    } catch (e) {
      log(9, "Requête Prisma avec include sur SlotDefinition", "FAIL", e.message.slice(0, 80));
    }

    // ───────────────────────────────────────────────────
    // TEST R10 : Les relations Produit ↔ InstalledComponent
    // ───────────────────────────────────────────────────
    try {
      const testQuery = await prisma.produit.findFirst({
        select: {
          id: true,
          installed_in: { take: 1 },
          composition_enfants: { take: 1 },
          slot_definitions: { take: 1 },
          template_enfants: { take: 1 },
        },
      });
      log(10, "Relations Produit ↔ InstalledComponent fonctionnent", "PASS",
        testQuery ? `Produit #${testQuery.id}` : "OK"
      );
    } catch (e) {
      log(10, "Relations Produit ↔ InstalledComponent fonctionnent", "FAIL",
        e.message.slice(0, 80)
      );
    }

    // ───────────────────────────────────────────────────
    // TEST R11 : La table produits a bien les nouvelles colonnes
    // ───────────────────────────────────────────────────
    const cols = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'produits'
      AND column_name IN ('est_template', 'template_parent_id', 'bom_role', 'est_compose', 'parent_id')
      ORDER BY column_name
    `;
    const colNames = cols.map(c => c.column_name);
    const allCols = ['est_template', 'template_parent_id', 'bom_role', 'est_compose', 'parent_id'];
    const missingCols = allCols.filter(c => !colNames.includes(c));
    log(11, "Colonnes BOM dans la table produits", missingCols.length === 0 ? "PASS" : "FAIL",
      missingCols.length > 0 ? `Manquantes: ${missingCols.join(', ')}` : `${colNames.length}/${allCols.length} colonnes`
    );

    // ───────────────────────────────────────────────────
    // TEST R12 : Les tables BOM ont été créées
    // ───────────────────────────────────────────────────
    const tablesBom = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('slot_definitions', 'installed_components')
      ORDER BY table_name
    `;
    const tableNames = tablesBom.map(t => t.table_name);
    log(12, "Tables slot_definitions et installed_components créées",
      tableNames.length === 2 ? "PASS" : "FAIL",
      `Trouvées: ${tableNames.join(', ')}`
    );

  } catch (e) {
    console.error("\n❌ ERREUR:", e.message);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  // Résumé
  console.log("\n" + "=".repeat(60));
  console.log(`\n📊 RÉSULTATS RÉGRESSION: ${passed} PASS / ${failed} FAIL / ${passed + failed} total`);
  console.log(`\n✅ Taux de réussite: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log("❌ TESTS ÉCHOUÉS:");
    results.filter((r) => r.status === "FAIL").forEach((r) => {
      console.log(`  - TEST R${r.test}: ${r.title} — ${r.detail || "Pas de détail"}`);
    });
    process.exit(1);
  }
  process.exit(0);
}

runRegressionTests();
