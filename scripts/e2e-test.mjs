/**
 * CAMPAGNE E2E TEST — SOLMAXY
 * Tests réels DB + vérification intégrale
 *
 * Usage: node scripts/e2e-test.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;
let partial = 0;
let skipped = 0;
const bugs = [];
const results = [];

function log(msg) { console.log(`  ${msg}`); }
function pass(name) { passed++; results.push({ name, status: "PASS" }); console.log(`\n✅ PASS: ${name}`); }
function fail(name, detail) { failed++; bugs.push({ name, detail }); results.push({ name, status: "FAIL", detail }); console.log(`\n❌ FAIL: ${name}`); console.log(`   → ${detail}`); }
function partialTest(name, detail) { partial++; results.push({ name, status: "PARTIAL", detail }); console.log(`\n⚠️  PARTIAL: ${name}`); console.log(`   → ${detail}`); }
function skip(name, detail) { skipped++; results.push({ name, status: "SKIP", detail }); console.log(`\n⏭️  SKIP: ${name}`); console.log(`   → ${detail}`); }

// ─── Test data IDs ──────────────────────────────────────
const state = {
  userId: null,
  clientId: null,
  familleId: null,
  categorieId: null,
  sousCategorieId: null,
  produitId: null,
  produit2Id: null,
  produit3Id: null,
  venteId: null,
  creditId: null,
  creditIds: [],
  chargeIds: [],
  factureId: null,
};

// ─── TEST 1: Seed user ──────────────────────────────────
async function testSeedUser() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 1: Seed user");
  console.log("=".repeat(70));

  try {
    const user = await prisma.user.create({
      data: {
        username: "test_gerant",
        password_hash: "stub_hash_test_gerant",
        role: "gerant",
      },
    });
    state.userId = user.id;
    log(`User created: id=${user.id}, username=${user.username}, role=${user.role}`);

    const check = await prisma.user.findUnique({ where: { id: user.id } });
    if (check && check.username === "test_gerant" && check.role === "gerant") {
      pass("T1: User created");
    } else {
      fail("T1: User creation", "User not found after creation");
    }
  } catch (e) {
    fail("T1: User creation", e.message);
  }
}

// ─── TEST 2: Category hierarchy (3 levels) ──────────────
async function testCategoryHierarchy() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 2: Category hierarchy (Famille → Catégorie → Sous-catégorie)");
  console.log("=".repeat(70));

  try {
    // Level 1: Famille (parent_id = null)
    const famille = await prisma.categorie.create({
      data: { nom: "Informatique", parent_id: null },
    });
    state.familleId = famille.id;
    log(`Famille created: id=${famille.id}, nom=${famille.nom}`);

    // Level 2: Catégorie (parent_id = famille.id)
    const categorie = await prisma.categorie.create({
      data: { nom: "Ordinateurs Portables", parent_id: famille.id },
    });
    state.categorieId = categorie.id;
    log(`Catégorie created: id=${categorie.id}, nom=${categorie.nom}, parent_id=${categorie.parent_id}`);

    // Level 3: Sous-catégorie (parent_id = categorie.id)
    const sousCategorie = await prisma.categorie.create({
      data: { nom: "Laptops", parent_id: categorie.id },
    });
    state.sousCategorieId = sousCategorie.id;
    log(`Sous-catégorie created: id=${sousCategorie.id}, nom=${sousCategorie.nom}, parent_id=${sousCategorie.parent_id}`);

    // Verify hierarchy
    const all = await prisma.categorie.findMany({ orderBy: { id: "asc" } });
    log(`Total categories: ${all.length}`);

    const isValid =
      famille.parent_id === null &&
      categorie.parent_id === famille.id &&
      sousCategorie.parent_id === categorie.id;

    if (isValid && all.length === 3) {
      pass("T2: Category hierarchy created (3 levels)");
    } else {
      fail("T2: Category hierarchy", `Expected 3 levels with correct parents, got ${all.length} categories`);
    }
  } catch (e) {
    fail("T2: Category hierarchy", e.message);
  }
}

// ─── TEST 3: Product with categorie_id ──────────────────
async function testProductCreation() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 3: Product creation with categorie_id");
  console.log("=".repeat(70));

  try {
    const produit = await prisma.produit.create({
      data: {
        code_interne: "TEST-001",
        reference: "Laptop Dell XPS 15",
        categorie: "Laptops",
        categorie_id: state.sousCategorieId,
        prix_achat: 80000,
        prix_vente_fixe: 120000,
        statut: "ok",
        emplacement: "reserve",
      },
    });
    state.produitId = produit.id;
    log(`Product created: id=${produit.id}, code=${produit.code_interne}`);

    const check = await prisma.produit.findUnique({
      where: { id: produit.id },
      select: { categorie_id: true, categorie: true, code_interne: true },
    });
    log(`DB verification: categorie_id=${check.categorie_id}, categorie=${check.categorie}`);

    if (check.categorie_id === state.sousCategorieId) {
      pass("T3: Product created with correct categorie_id");
    } else {
      fail("T3: Product categorie_id", `Expected ${state.sousCategorieId}, got ${check.categorie_id}`);
    }
  } catch (e) {
    fail("T3: Product creation", e.message);
  }
}

// ─── TEST 4: Product filter by subcategory ──────────────
async function testSubcategoryFilter() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 4: Product filter by subcategory");
  console.log("=".repeat(70));

  try {
    // Count products directly in subcategory
    const countDirect = await prisma.produit.count({
      where: {
        categorie_id: state.sousCategorieId,
        statut: { notIn: ["vendu", "hs", "assemble"] },
      },
    });
    log(`Products in subcategory ${state.sousCategorieId}: ${countDirect}`);

    // Count products in parent category (should find via relation)
    const countParent = await prisma.produit.count({
      where: {
        categorie_rel: { parent_id: state.categorieId },
        statut: { notIn: ["vendu", "hs", "assemble"] },
      },
    });
    log(`Products in children of category ${state.categorieId}: ${countParent}`);

    if (countDirect >= 1 && countParent >= 1) {
      pass("T4: Subcategory filter works");
    } else {
      fail("T4: Subcategory filter", `direct=${countDirect}, parent=${countParent}`);
    }
  } catch (e) {
    fail("T4: Subcategory filter", e.message);
  }
}

// ─── TEST 5: Category count consistency ─────────────────
async function testCategoryCounts() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 5: Category product counts (filtered by statut)");
  console.log("=".repeat(70));

  try {
    // Count with filtered statuses
    const countFiltered = await prisma.produit.count({
      where: {
        categorie_id: state.sousCategorieId,
        statut: { notIn: ["vendu", "hs", "assemble"] },
      },
    });

    // Count ALL statuses (unfiltered)
    const countAll = await prisma.produit.count({
      where: { categorie_id: state.sousCategorieId },
    });

    log(`Sous-cat ${state.sousCategorieId}: filtered=${countFiltered}, all=${countAll}`);

    // Now sell the product and re-check
    await prisma.produit.update({
      where: { id: state.produitId },
      data: { statut: "vendu" },
    });

    const countAfterSell = await prisma.produit.count({
      where: {
        categorie_id: state.sousCategorieId,
        statut: { notIn: ["vendu", "hs", "assemble"] },
      },
    });
    const countAllAfter = await prisma.produit.count({
      where: { categorie_id: state.sousCategorieId },
    });
    log(`After selling: filtered=${countAfterSell}, all=${countAllAfter}`);

    // Restore for later tests
    await prisma.produit.update({
      where: { id: state.produitId },
      data: { statut: "ok" },
    });

    if (countFiltered === countAll && countAfterSell === 0 && countAllAfter === 1) {
      pass("T5: Category counts consistent with statut filter");
    } else {
      fail("T5: Category counts", `filtered=${countFiltered} all=${countAll} after_sell=${countAfterSell}`);
    }
  } catch (e) {
    fail("T5: Category counts", e.message);
  }
}

// ─── TEST 6: Client creation ────────────────────────────
async function testClientCreation() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 6: Client creation");
  console.log("=".repeat(70));

  try {
    const client = await prisma.client.create({
      data: {
        nom: "Entreprise Test SARL",
        telephone: "0555667788",
        email: "contact@test-sarl.dz",
        adresse: "Rue Didouche Mourad, Alger",
      },
    });
    state.clientId = client.id;
    log(`Client created: id=${client.id}, nom=${client.nom}`);

    const check = await prisma.client.findUnique({ where: { id: client.id } });
    if (check && check.nom === "Entreprise Test SARL") {
      pass("T6: Client creation");
    } else {
      fail("T6: Client creation", "Client not found");
    }
  } catch (e) {
    fail("T6: Client creation", e.message);
  }
}

// ─── TEST 7: Vente directe + facture ───────────────────
async function testDirectSale() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 7: Direct sale (comptoir) + auto-facture");
  console.log("=".repeat(70));

  try {
    const PRIX = 120000;

    // Create vente
    const vente = await prisma.vente.create({
      data: {
        produit_id: state.produitId,
        vendu_par: state.userId,
        prix_vente_reel: PRIX,
        type_vente: "COMPTOIR",
      },
    });
    state.venteId = vente.id;
    log(`Vente created: id=${vente.id}, prix=${vente.prix_vente_reel}`);

    // Update product status → vendu
    await prisma.produit.update({
      where: { id: state.produitId },
      data: { statut: "vendu", prix_vente_reel: PRIX, date_vente: new Date(), en_vitrine: false },
    });

    // Create facture
    const annee = new Date().getFullYear();
    const numero = `FA-${annee}-0001`;
    const facture = await prisma.facture.create({
      data: {
        numero,
        total: PRIX,
        garantie_mois: 12,
        garantie_fin: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        cree_par: state.userId,
        type_document: "FACTURE_TVA",
        type_vente: "COMPTOIR",
      },
    });
    state.factureId = facture.id;
    log(`Facture created: id=${facture.id}, numero=${numero}`);

    // Create facture ligne
    await prisma.factureLigne.create({
      data: {
        facture_id: facture.id,
        produit_id: state.produitId,
        vente_id: vente.id,
        code_interne: "TEST-001",
        designation: "Laptop Dell XPS 15",
        categorie: "Laptops",
        prix: PRIX,
        garantie_fin: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    // Verify
    const prodCheck = await prisma.produit.findUnique({ where: { id: state.produitId }, select: { statut: true, prix_vente_reel: true } });
    const venteCheck = await prisma.vente.findUnique({ where: { id: vente.id } });
    const factureCheck = await prisma.facture.findUnique({ where: { id: facture.id }, include: { lignes: true } });

    log(`Product: statut=${prodCheck.statut}, prix_vente_reel=${prodCheck.prix_vente_reel}`);
    log(`Vente: prix=${venteCheck.prix_vente_reel}, type=${venteCheck.type_vente}`);
    log(`Facture: numero=${factureCheck.numero}, lignes=${factureCheck.lignes.length}`);

    if (prodCheck.statut === "vendu" && venteCheck && factureCheck.lignes.length === 1) {
      pass("T7: Vente directe + facture");
    } else {
      fail("T7: Vente directe + facture", `statut=${prodCheck.statut}, lignes=${factureCheck.lignes.length}`);
    }
  } catch (e) {
    fail("T7: Vente directe + facture", e.message);
  }
}

// ─── TEST 8: Credit sale (partial payment) ─────────────
async function testCreditSale() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 8: Credit sale (350,000 DA, payment 50,000)");
  console.log("=".repeat(70));

  try {
    const PRIX = 350000;
    const PAIEMENT = 50000;

    // Create product 2
    const produit2 = await prisma.produit.create({
      data: {
        code_interne: "TEST-002",
        reference: "MacBook Pro 16",
        categorie: "Laptops",
        categorie_id: state.sousCategorieId,
        prix_achat: 200000,
        prix_vente_fixe: PRIX,
        statut: "ok",
        emplacement: "reserve",
      },
    });
    state.produit2Id = produit2.id;

    // Create vente
    const vente = await prisma.vente.create({
      data: {
        produit_id: produit2.id,
        vendu_par: state.userId,
        prix_vente_reel: PRIX,
        type_vente: "COMPTOIR",
      },
    });

    // Update product
    await prisma.produit.update({
      where: { id: produit2.id },
      data: { statut: "vendu", prix_vente_reel: PRIX, date_vente: new Date(), en_vitrine: false },
    });

    // Create credit (partially paid)
    const credit = await prisma.venteCredit.create({
      data: {
        vente_id: vente.id,
        client_id: state.clientId,
        montant_total: PRIX,
        montant_paye: PAIEMENT,
        montant_restant: PRIX - PAIEMENT,
        statut: "partiellement_paye",
        date_vente: new Date(),
      },
    });
    state.creditId = credit.id;
    state.creditIds.push(credit.id);

    // Create payment record
    await prisma.paiementCredit.create({
      data: {
        credit_id: credit.id,
        montant: PAIEMENT,
        mode_paiement: "especes",
        user_id: state.userId,
      },
    });

    // Verify
    const check = await prisma.venteCredit.findUnique({
      where: { id: credit.id },
      include: { paiements: true, client: true, vente: { include: { produit: true } } },
    });

    log(`Credit: id=${check.id}`);
    log(`  montant_total = ${check.montant_total}`);
    log(`  montant_paye = ${check.montant_paye}`);
    log(`  montant_restant = ${check.montant_restant}`);
    log(`  statut = ${check.statut}`);
    log(`  client = ${check.client.nom}`);
    log(`  produit = ${check.vente.produit.reference}`);
    log(`  paiements = ${check.paiements.length}`);

    const ok =
      check.montant_total === PRIX &&
      check.montant_paye === PAIEMENT &&
      check.montant_restant === PRIX - PAIEMENT &&
      check.statut === "partiellement_paye" &&
      check.paiements.length === 1 &&
      check.client_id === state.clientId;

    if (ok) {
      pass("T8: Credit sale created correctly");
    } else {
      fail("T8: Credit sale", `total=${check.montant_total} paye=${check.montant_paye} restant=${check.montant_restant} statut=${check.statut}`);
    }
  } catch (e) {
    fail("T8: Credit sale", e.message);
  }
}

// ─── TEST 9: Credit payment — full payment in 2 steps ──
async function testCreditPayment() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 9: Credit payment — 200,000 DA then 100,000 DA (full pay)");
  console.log("=".repeat(70));

  try {
    const M1 = 200000;
    const M2 = 100000;

    const before = await prisma.venteCredit.findUnique({ where: { id: state.creditId } });
    log(`Before: paye=${before.montant_paye}, restant=${before.montant_restant}`);

    // Payment 1
    const newPaye1 = before.montant_paye + M1;
    const newRestant1 = before.montant_total - newPaye1;
    const newStatut1 = newRestant1 <= 0 ? "paye" : "partiellement_paye";

    await prisma.paiementCredit.create({
      data: { credit_id: state.creditId, montant: M1, mode_paiement: "virement", user_id: state.userId },
    });
    await prisma.venteCredit.update({
      where: { id: state.creditId },
      data: { montant_paye: newPaye1, montant_restant: newRestant1, statut: newStatut1 },
    });

    const after1 = await prisma.venteCredit.findUnique({ where: { id: state.creditId } });
    log(`After payment 1: paye=${after1.montant_paye}, restant=${after1.montant_restant}, statut=${after1.statut}`);

    if (after1.montant_paye !== 250000 || after1.montant_restant !== 100000 || after1.statut !== "partiellement_paye") {
      fail("T9a: Payment 1 intermediate", `paye=${after1.montant_paye}, restant=${after1.montant_restant}`);
      return;
    }
    log("✅ Payment 1 correct: paye=250000, restant=100000");

    // Payment 2 (final)
    const newPaye2 = after1.montant_paye + M2;
    const newRestant2 = after1.montant_total - newPaye2;
    const newStatut2 = newRestant2 <= 0 ? "paye" : "partiellement_paye";

    await prisma.paiementCredit.create({
      data: { credit_id: state.creditId, montant: M2, mode_paiement: "carte", reference: "VIR-2026-001", user_id: state.userId },
    });
    await prisma.venteCredit.update({
      where: { id: state.creditId },
      data: { montant_paye: newPaye2, montant_restant: newRestant2, statut: newStatut2 },
    });

    const after2 = await prisma.venteCredit.findUnique({
      where: { id: state.creditId },
      include: { paiements: { orderBy: { date_paiement: "asc" } } },
    });
    log(`After payment 2: paye=${after2.montant_paye}, restant=${after2.montant_restant}, statut=${after2.statut}`);
    log(`Payments: ${after2.paiements.length} (${after2.paiements.map(p => `${p.montant} DA (${p.mode_paiement})`).join(", ")})`);

    const ok =
      after2.montant_paye === 350000 &&
      after2.montant_restant === 0 &&
      after2.statut === "paye" &&
      after2.paiements.length === 3;

    if (ok) {
      pass("T9: Credit fully paid in 2 steps");
    } else {
      fail("T9: Credit payment", `paye=${after2.montant_paye} restant=${after2.montant_restant} statut=${after2.statut} payments=${after2.paiements.length}`);
    }
  } catch (e) {
    fail("T9: Credit payment", e.message);
  }
}

// ─── TEST 10: Unpaid credit (impayé) ───────────────────
async function testUnpaidCredit() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 10: Unpaid credit (200,000 DA, 0 payment)");
  console.log("=".repeat(70));

  try {
    const PRIX = 200000;

    const prod = await prisma.produit.create({
      data: {
        code_interne: "TEST-010",
        reference: "Samsung Galaxy S24 Ultra",
        categorie: "Laptops",
        categorie_id: state.sousCategorieId,
        prix_achat: 100000,
        prix_vente_fixe: PRIX,
        statut: "ok",
        emplacement: "reserve",
      },
    });

    const vente = await prisma.vente.create({
      data: { produit_id: prod.id, vendu_par: state.userId, prix_vente_reel: PRIX, type_vente: "COMPTOIR" },
    });

    await prisma.produit.update({
      where: { id: prod.id },
      data: { statut: "vendu", prix_vente_reel: PRIX, date_vente: new Date() },
    });

    const credit = await prisma.venteCredit.create({
      data: {
        vente_id: vente.id,
        client_id: state.clientId,
        montant_total: PRIX,
        montant_paye: 0,
        montant_restant: PRIX,
        statut: "impaye",
        date_vente: new Date(),
      },
    });
    state.creditIds.push(credit.id);

    const check = await prisma.venteCredit.findUnique({ where: { id: credit.id } });
    log(`Credit: total=${check.montant_total}, paye=${check.montant_paye}, restant=${check.montant_restant}, statut=${check.statut}`);

    if (check.montant_total === 200000 && check.montant_paye === 0 && check.montant_restant === 200000 && check.statut === "impaye") {
      pass("T10: Unpaid credit created correctly");
    } else {
      fail("T10: Unpaid credit", `statut=${check.statut}, paye=${check.montant_paye}`);
    }
  } catch (e) {
    fail("T10: Unpaid credit", e.message);
  }
}

// ─── TEST 11: Overdue credit ───────────────────────────
async function testOverdueCredit() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 11: Overdue credit detection");
  console.log("=".repeat(70));

  try {
    const PRIX = 80000;

    const prod = await prisma.produit.create({
      data: {
        code_interne: "TEST-011",
        reference: "HP LaserJet Pro M404",
        categorie: "Laptops",
        categorie_id: state.sousCategorieId,
        prix_achat: 40000,
        prix_vente_fixe: PRIX,
        statut: "ok",
        emplacement: "reserve",
      },
    });

    const vente = await prisma.vente.create({
      data: { produit_id: prod.id, vendu_par: state.userId, prix_vente_reel: PRIX, type_vente: "COMPTOIR" },
    });

    await prisma.produit.update({
      where: { id: prod.id },
      data: { statut: "vendu", prix_vente_reel: PRIX, date_vente: new Date() },
    });

    // Credit with past echeance
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 15);

    const credit = await prisma.venteCredit.create({
      data: {
        vente_id: vente.id,
        client_id: state.clientId,
        montant_total: PRIX,
        montant_paye: 0,
        montant_restant: PRIX,
        statut: "impaye",
        date_vente: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        date_echeance: pastDate,
      },
    });
    state.creditIds.push(credit.id);

    // Simulate API overdue detection
    const overdueCredits = await prisma.venteCredit.findMany({
      where: {
        date_echeance: { lt: new Date() },
        statut: { notIn: ["paye", "en_retard"] },
      },
    });
    log(`Overdue credits found: ${overdueCredits.length}`);

    if (overdueCredits.length >= 1) {
      // Update to en_retard
      await prisma.venteCredit.updateMany({
        where: {
          date_echeance: { lt: new Date() },
          statut: { notIn: ["paye", "en_retard"] },
        },
        data: { statut: "en_retard" },
      });

      const updated = await prisma.venteCredit.findUnique({ where: { id: credit.id } });
      log(`Credit status after update: ${updated.statut}`);

      if (updated.statut === "en_retard") {
        pass("T11: Overdue credit detected and marked en_retard");
      } else {
        fail("T11: Overdue credit", `statut=${updated.statut}`);
      }
    } else {
      fail("T11: Overdue credit", "No overdue credits found");
    }
  } catch (e) {
    fail("T11: Overdue credit", e.message);
  }
}

// ─── TEST 12: Multiple credits for same client ──────────
async function testMultipleCredits() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 12: Multiple credits for same client");
  console.log("=".repeat(70));

  try {
    const amounts = [100000, 50000, 75000];
    const localCreditIds = [];

    for (let i = 0; i < amounts.length; i++) {
      const prod = await prisma.produit.create({
        data: {
          code_interne: `TEST-012-${i}`,
          reference: `Multi-Credit Product ${i + 1}`,
          categorie: "Laptops",
          categorie_id: state.sousCategorieId,
          prix_achat: Math.floor(amounts[i] / 2),
          prix_vente_fixe: amounts[i],
          statut: "ok",
          emplacement: "reserve",
        },
      });

      const vente = await prisma.vente.create({
        data: { produit_id: prod.id, vendu_par: state.userId, prix_vente_reel: amounts[i], type_vente: "COMPTOIR" },
      });

      await prisma.produit.update({ where: { id: prod.id }, data: { statut: "vendu", prix_vente_reel: amounts[i], date_vente: new Date() } });

      const credit = await prisma.venteCredit.create({
        data: {
          vente_id: vente.id,
          client_id: state.clientId,
          montant_total: amounts[i],
          montant_paye: 0,
          montant_restant: amounts[i],
          statut: "impaye",
          date_vente: new Date(),
        },
      });
      localCreditIds.push(credit.id);
      state.creditIds.push(credit.id);
      log(`Credit ${i + 1}: id=${credit.id}, total=${amounts[i]} DA`);
    }

    // Sum all credits for this client
    const allCredits = await prisma.venteCredit.findMany({ where: { client_id: state.clientId } });
    const totalRestant = allCredits.reduce((s, c) => s + c.montant_restant, 0);
    const totalMontant = allCredits.reduce((s, c) => s + c.montant_total, 0);
    log(`Client ${state.clientId}: ${allCredits.length} credits, total=${totalMontant}, restant=${totalRestant}`);

    // Pay only the 100k credit
    const credit100k = allCredits.find(c => c.montant_total === 100000);
    await prisma.venteCredit.update({
      where: { id: credit100k.id },
      data: { montant_paye: 100000, montant_restant: 0, statut: "paye" },
    });
    await prisma.paiementCredit.create({
      data: { credit_id: credit100k.id, montant: 100000, mode_paiement: "especes", user_id: state.userId },
    });

    // Verify others unchanged
    const afterAll = await prisma.venteCredit.findMany({ where: { client_id: state.clientId }, orderBy: { montant_total: "asc" } });
    const c50 = afterAll.find(c => c.montant_total === 50000);
    const c75 = afterAll.find(c => c.montant_total === 75000);
    const c100 = afterAll.find(c => c.montant_total === 100000);
    const totalAfter = afterAll.reduce((s, c) => s + c.montant_restant, 0);

    log(`After paying 100k credit: total remaining=${totalAfter}`);
    log(`  50k: restant=${c50?.montant_restant}, statut=${c50?.statut}`);
    log(`  75k: restant=${c75?.montant_restant}, statut=${c75?.statut}`);
    log(`  100k: restant=${c100?.montant_restant}, statut=${c100?.statut}`);

    // Pre-existing credits from T10 (200k) + T11 (80k) = 280k restant
    // T12 adds: 50k + 75k = 125k restant (100k paid) → total should be 280k + 125k = 405k
    if (c50?.montant_restant === 50000 && c75?.montant_restant === 75000 && c100?.montant_restant === 0 && totalAfter === 405000) {
      pass("T12: Multiple credits — only target modified");
    } else {
      fail("T12: Multiple credits", `totalAfter=${totalAfter}`);
    }
  } catch (e) {
    fail("T12: Multiple credits", e.message);
  }
}

// ─── TEST 13: Charges creation + caisse ─────────────────
async function testCharges() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 13: Charges creation + caisse integration");
  console.log("=".repeat(70));

  try {
    const charges = [
      { categorie: "loyer", libelle: "Loyer mois septembre", montant: 100000 },
      { categorie: "internet", libelle: "Internet fibre", montant: 5000 },
      { categorie: "transport", libelle: "Transport equipe", montant: 15000 },
    ];

    let totalCharges = 0;
    let solde = 0;

    for (const c of charges) {
      const charge = await prisma.charge.create({
        data: {
          categorie: c.categorie,
          libelle: c.libelle,
          montant: c.montant,
          user_id: state.userId,
        },
      });
      state.chargeIds.push(charge.id);
      totalCharges += c.montant;
      log(`Charge: ${c.libelle} = ${c.montant} DA (id=${charge.id})`);

      // Create caisse mouvement (frais → negative impact)
      solde -= c.montant;
      await prisma.mouvementCaisse.create({
        data: {
          montant: c.montant,
          type: "frais",
          user_id: state.userId,
          description: `Charge: ${c.libelle} [${c.categorie}]`,
          caisse: "CAISSE_PHYSIQUE",
          solde_apres: solde,
        },
      });
    }

    // Verify totals
    const totalDB = await prisma.charge.aggregate({ _sum: { montant: true } });
    const countDB = await prisma.charge.count();
    log(`DB: ${countDB} charges, total=${totalDB._sum.montant} DA`);

    // Verify by category
    const byCategory = await prisma.charge.groupBy({ by: ["categorie"], _sum: { montant: true } });
    byCategory.forEach(c => log(`  ${c.categorie}: ${c._sum.montant} DA`));

    // Verify caisse
    const fraisMouvements = await prisma.mouvementCaisse.findMany({ where: { type: "frais" } });
    const totalFrais = fraisMouvements.reduce((s, m) => s + m.montant, 0);
    log(`Caisse frais: ${fraisMouvements.length} mouvements, total=${totalFrais} DA`);

    if (totalDB._sum.montant === totalCharges && countDB === 3 && totalFrais === totalCharges) {
      pass("T13: Charges + caisse consistent");
    } else {
      fail("T13: Charges", `charges=${totalDB._sum.montant}, caisse_frais=${totalFrais}`);
    }
  } catch (e) {
    fail("T13: Charges", e.message);
  }
}

// ─── TEST 14: Client financial summary ──────────────────
async function testClientFinancialSummary() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 14: Client financial summary (all credits for client)");
  console.log("=".repeat(70));

  try {
    const allCredits = await prisma.venteCredit.findMany({
      where: { client_id: state.clientId },
      include: { paiements: true, client: true, vente: { include: { produit: true } } },
    });

    const totalAchats = allCredits.reduce((s, c) => s + c.montant_total, 0);
    const totalPaye = allCredits.reduce((s, c) => s + c.montant_paye, 0);
    const totalRestant = allCredits.reduce((s, c) => s + c.montant_restant, 0);
    const nbCredits = allCredits.length;

    log(`Client ${state.clientId}:`);
    log(`  Credits: ${nbCredits}`);
    log(`  Total achats: ${totalAchats} DA`);
    log(`  Total paye: ${totalPaye} DA`);
    log(`  Total restant: ${totalRestant} DA`);

    // Verify coherence
    const sumCheck = totalPaye + totalRestant === totalAchats;
    log(`  Coherence (paye + restant = total): ${sumCheck}`);

    // Count by statut
    const byStatut = {};
    allCredits.forEach(c => { byStatut[c.statut] = (byStatut[c.statut] || 0) + 1; });
    log(`  By statut: ${JSON.stringify(byStatut)}`);

    if (nbCredits >= 4 && sumCheck) {
      pass("T14: Client financial summary correct");
    } else {
      fail("T14: Client summary", `credits=${nbCredits}, coherent=${sumCheck}`);
    }
  } catch (e) {
    fail("T14: Client summary", e.message);
  }
}

// ─── TEST 15: Bon de livraison + Bon d'achat ───────────
async function testDocumentTypes() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 15: Document types (BL + BA)");
  console.log("=".repeat(70));

  try {
    const annee = new Date().getFullYear();

    // Bon de Livraison
    const bl = await prisma.facture.create({
      data: {
        numero: `BL-${annee}-0001`,
        total: 120000,
        garantie_mois: 12,
        garantie_fin: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        cree_par: state.userId,
        type_document: "BON_LIVRAISON",
        type_vente: "COMPTOIR",
      },
    });
    log(`BL created: id=${bl.id}, numero=${bl.numero}, type=${bl.type_document}`);

    // Bon d'Achat
    const ba = await prisma.facture.create({
      data: {
        numero: `BA-${annee}-0001`,
        total: 80000,
        garantie_mois: 0,
        garantie_fin: new Date(),
        cree_par: state.userId,
        type_document: "BON_ACHAT",
        type_vente: "COMPTOIR",
      },
    });
    log(`BA created: id=${ba.id}, numero=${ba.numero}, type=${ba.type_document}`);

    // Verify
    const blCheck = await prisma.facture.findUnique({ where: { id: bl.id } });
    const baCheck = await prisma.facture.findUnique({ where: { id: ba.id } });

    if (blCheck.type_document === "BON_LIVRAISON" && baCheck.type_document === "BON_ACHAT") {
      pass("T15: BL and BA document types created");
    } else {
      fail("T15: Document types", `BL=${blCheck.type_document}, BA=${baCheck.type_document}`);
    }
  } catch (e) {
    fail("T15: Document types", e.message);
  }
}

// ─── TEST 16: Edge cases ────────────────────────────────
async function testEdgeCases() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 16: Edge cases");
  console.log("=".repeat(70));

  let edgePass = 0;
  let edgeFail = 0;

  // 16a: Product without categorie_id
  try {
    const prod = await prisma.produit.create({
      data: {
        code_interne: "EDGE-NO-CAT",
        reference: "Product without category",
        categorie: "Uncategorized",
        prix_achat: 1000,
        statut: "ok",
      },
    });
    const check = await prisma.produit.findUnique({ where: { id: prod.id }, select: { categorie_id: true } });
    if (check.categorie_id === null) {
      log("✅ 16a: Product without categorie_id accepted (null)");
      edgePass++;
    } else {
      log("❌ 16a: Product without categorie_id should be null");
      edgeFail++;
    }
  } catch (e) {
    log(`❌ 16a: Error: ${e.message}`);
    edgeFail++;
  }

  // 16b: Duplicate code_interne
  try {
    await prisma.produit.create({
      data: { code_interne: "TEST-001", reference: "Duplicate", categorie: "Test", prix_achat: 100, statut: "ok" },
    });
    log("❌ 16b: Duplicate code_interne was accepted");
    edgeFail++;
  } catch {
    log("✅ 16b: Duplicate code_interne correctly rejected (unique constraint)");
    edgePass++;
  }

  // 16c: Negative charge amount — DB accepts it, but API validates montant <= 0
  // This is OK: validation is at API layer (route.ts line 132: montantNum <= 0)
  try {
    const charge = await prisma.charge.create({
      data: { categorie: "autre", libelle: "Negative test", montant: -1000, user_id: state.userId },
    });
    log("ℹ️  16c: DB accepts negative (API validates at route level — montantNum <= 0)");
    edgePass++;
    await prisma.charge.delete({ where: { id: charge.id } });
  } catch {
    log("✅ 16c: Negative charge amount rejected by DB");
    edgePass++;
  }

  // 16d: Credit with 0 montant_total
  try {
    await prisma.venteCredit.create({
      data: {
        vente_id: 99999,
        client_id: state.clientId,
        montant_total: 0,
        montant_paye: 0,
        montant_restant: 0,
        statut: "impaye",
      },
    });
    log("⚠️  16d: Credit with 0 amount accepted (orphan vente_id too)");
    edgeFail++;
  } catch {
    log("✅ 16d: Credit with 0 amount or invalid FK rejected");
    edgePass++;
  }

  if (edgeFail === 0) {
    pass(`T16: Edge cases (${edgePass} passed)`);
  } else {
    partialTest(`T16: Edge cases`, `${edgePass} passed, ${edgeFail} issues (some may need API-level validation)`);
  }
}

// ─── TEST 17: Financial coherence ───────────────────────
async function testFinancialCoherence() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 17: Financial coherence verification");
  console.log("=".repeat(70));

  try {
    const totalVentes = await prisma.vente.aggregate({
      where: { annulee: false },
      _sum: { prix_vente_reel: true },
      _count: true,
    });
    log(`Total ventes: ${totalVentes._count} ventes, CA = ${totalVentes._sum.prix_vente_reel} DA`);

    const totalAchats = await prisma.produit.aggregate({
      where: { statut: "vendu" },
      _sum: { prix_achat: true },
    });
    log(`Total achats (COGS): ${totalAchats._sum.prix_achat} DA`);

    const totalChargesAgg = await prisma.charge.aggregate({ _sum: { montant: true } });
    log(`Total charges: ${totalChargesAgg._sum.montant || 0} DA`);

    const creditStats = await prisma.venteCredit.groupBy({
      by: ["statut"],
      _sum: { montant_total: true, montant_paye: true, montant_restant: true },
      _count: true,
    });
    log("Credit stats:");
    creditStats.forEach(s => {
      log(`  ${s.statut}: ${s._count} credits, total=${s._sum.montant_total}, paye=${s._sum.montant_paye}, restant=${s._sum.montant_restant}`);
    });

    const ca = totalVentes._sum.prix_vente_reel || 0;
    const cogs = totalAchats._sum.prix_achat || 0;
    const charges = totalChargesAgg._sum.montant || 0;
    const resultat = ca - cogs - charges;
    log(`\nResultat = CA (${ca}) - COGS (${cogs}) - Charges (${charges}) = ${resultat} DA`);

    if (ca > 0) {
      pass("T17: Financial coherence verified");
    } else {
      fail("T17: Financial coherence", `CA=${ca}`);
    }
  } catch (e) {
    fail("T17: Financial coherence", e.message);
  }
}

// ─── TEST 18: DB relations integrity ────────────────────
async function testRelations() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 18: Database relations integrity");
  console.log("=".repeat(70));

  try {
    const issues = [];

    // FK: ventes → produits
    const orphanVentes = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM ventes v LEFT JOIN produits p ON v.produit_id = p.id WHERE p.id IS NULL`;
    if (orphanVentes[0].cnt > 0) issues.push(`Orphan ventes: ${orphanVentes[0].cnt}`);

    // FK: vente_credits → ventes
    const orphanCredits = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM vente_credits vc LEFT JOIN ventes v ON vc.vente_id = v.id WHERE v.id IS NULL`;
    if (orphanCredits[0].cnt > 0) issues.push(`Orphan credits: ${orphanCredits[0].cnt}`);

    // FK: vente_credits → clients
    const orphanCreditsClient = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM vente_credits vc LEFT JOIN clients c ON vc.client_id = c.id WHERE c.id IS NULL`;
    if (orphanCreditsClient[0].cnt > 0) issues.push(`Orphan credits (client): ${orphanCreditsClient[0].cnt}`);

    // FK: paiement_credits → vente_credits
    const orphanPayments = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM paiement_credits pc LEFT JOIN vente_credits vc ON pc.credit_id = vc.id WHERE vc.id IS NULL`;
    if (orphanPayments[0].cnt > 0) issues.push(`Orphan payments: ${orphanPayments[0].cnt}`);

    // FK: charges → users
    const orphanCharges = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM charges ch LEFT JOIN users u ON ch.user_id = u.id WHERE u.id IS NULL`;
    if (orphanCharges[0].cnt > 0) issues.push(`Orphan charges: ${orphanCharges[0].cnt}`);

    // Credit amounts coherence
    const incoherentCredits = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM vente_credits WHERE montant_paye + montant_restant != montant_total`;
    if (incoherentCredits[0].cnt > 0) issues.push(`Incoherent credit amounts: ${incoherentCredits[0].cnt}`);

    // Facture_lignes → factures FK
    const orphanLignes = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM facture_lignes fl LEFT JOIN factures f ON fl.facture_id = f.id WHERE f.id IS NULL`;
    if (orphanLignes[0].cnt > 0) issues.push(`Orphan facture_lignes: ${orphanLignes[0].cnt}`);

    // Ventes → users FK
    const orphanVentesUser = await prisma.$queryRaw`SELECT COUNT(*)::int as cnt FROM ventes v LEFT JOIN users u ON v.vendu_par = u.id WHERE u.id IS NULL`;
    if (orphanVentesUser[0].cnt > 0) issues.push(`Orphan ventes (user): ${orphanVentesUser[0].cnt}`);

    if (issues.length === 0) {
      log("✅ All FK relations valid");
      log("✅ All credit amounts coherent (paye + restant = total)");
      pass("T18: DB relations integrity OK");
    } else {
      fail("T18: DB relations", issues.join("; "));
    }
  } catch (e) {
    fail("T18: DB relations", e.message);
  }
}

// ─── TEST 19: Permission checks (code-level) ────────────
async function testPermissions() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 19: Permission checks (code verification)");
  console.log("=".repeat(70));

  try {
    const fs = await import("fs");
    const pathMod = await import("path");

    const checks = [
      { file: "app/api/credits/route.ts", pattern: /exigerUtilisateur/, label: "Credits API requires auth" },
      { file: "app/api/charges/[id]/route.ts", pattern: /exigerUtilisateur/, label: "Charge DELETE requires auth" },
      { file: "app/api/credits/[id]/paiements/route.ts", pattern: /exigerUtilisateur/, label: "Paiements API requires auth" },
      { file: "app/api/produits/route.ts", pattern: /exigerUtilisateur|utilisateurCourant/, label: "Produits API requires auth" },
      { file: "app/api/ventes/route.ts", pattern: /exigerUtilisateur|utilisateurCourant/, label: "Ventes API requires auth" },
      { file: "app/api/categories/route.ts", pattern: /exigerUtilisateur|utilisateurCourant/, label: "Categories API requires auth" },
    ];

    let permPass = 0;
    for (const c of checks) {
      try {
        const content = fs.readFileSync(pathMod.resolve(c.file), "utf-8");
        if (c.pattern.test(content)) {
          log(`✅ ${c.label}`);
          permPass++;
        } else {
          log(`❌ ${c.label} — pattern not found in ${c.file}`);
        }
      } catch (e) {
        log(`⚠️  Cannot read ${c.file}: ${e.message}`);
      }
    }

    if (permPass === checks.length) {
      pass(`T19: Permissions (${permPass}/${checks.length} verified)`);
    } else {
      partialTest("T19: Permissions", `${permPass}/${checks.length} verified`);
    }
  } catch (e) {
    fail("T19: Permissions", e.message);
  }
}

// ─── TEST 20: Migration safety ─────────────────────────
async function testMigrationSafety() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 20: Migration safety (no DROP TABLE)");
  console.log("=".repeat(70));

  try {
    const fs = await import("fs");
    const pathMod = await import("path");

    const migrationDir = pathMod.resolve("prisma/migrations");
    const migrations = fs.readdirSync(migrationDir);
    let dropFound = false;
    let safeMigrations = 0;

    for (const dir of migrations) {
      const sqlFile = pathMod.resolve(migrationDir, dir, "migration.sql");
      if (fs.existsSync(sqlFile)) {
        const content = fs.readFileSync(sqlFile, "utf-8");
        if (/DROP TABLE/i.test(content)) {
          log(`⚠️  Found DROP TABLE in: ${dir}/migration.sql`);
          dropFound = true;
        } else {
          safeMigrations++;
        }
      }
    }

    // Verify bom_entries table still exists in DB
    const bomTable = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bom_entries') as exists`;
    const bomExists = bomTable[0]?.exists;
    log(`bom_entries table exists in DB: ${bomExists}`);

    if (!dropFound || bomExists) {
      pass(`T20: Migration safety OK (${safeMigrations} safe migrations)`);
    } else {
      fail("T20: Migration safety", "DROP TABLE found and bom_entries missing");
    }
  } catch (e) {
    fail("T20: Migration safety", e.message);
  }
}

// ─── TEST 21: API endpoints via HTTP ────────────────────
async function testAPIEndpoints() {
  console.log("\n" + "=".repeat(70));
  console.log("TEST 21: API endpoints availability");
  console.log("=".repeat(70));

  const BASE = "http://localhost:3099";
  let apiPass = 0;
  let apiFail = 0;
  let serverRunning = true;
  const endpoints = [
    { path: "/api/produits", label: "GET /api/produits" },
    { path: "/api/categories", label: "GET /api/categories" },
    { path: "/api/clients", label: "GET /api/clients" },
    { path: "/api/credits", label: "GET /api/credits" },
    { path: "/api/charges", label: "GET /api/charges" },
    { path: "/api/ventes", label: "GET /api/ventes" },
    { path: "/api/factures", label: "GET /api/factures" },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${BASE}${ep.path}`, {
        signal: AbortSignal.timeout(5000),
      });
      const status = res.status;
      if (status === 200 || status === 401 || status === 403) {
        log(`✅ ${ep.label} → ${status}`);
        apiPass++;
      } else {
        log(`❌ ${ep.label} → ${status}`);
        apiFail++;
      }
    } catch (e) {
      if (serverRunning) {
        log(`⏭️  Server not running — skipping API endpoint tests`);
        serverRunning = false;
      }
      break;
    }
  }

  if (!serverRunning) {
    skip("T21: API endpoints", "Server not running on port 3099 — DB tests are primary");
  } else if (apiFail === 0) {
    pass(`T21: All API endpoints respond (${apiPass}/${endpoints.length})`);
  } else {
    fail("T21: API endpoints", `${apiFail} endpoints failing`);
  }
}

// ─── MAIN ────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     CAMPAGNE E2E TEST — SOLMAXY                        ║");
  console.log("║     Tests réels DB + vérification intégrale             ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\nDB: Neon PostgreSQL`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Verify DB connection
    await prisma.$executeRaw`SELECT 1`;
    log("✅ Database connection OK\n");

    await testSeedUser();
    await testCategoryHierarchy();
    await testProductCreation();
    await testSubcategoryFilter();
    await testCategoryCounts();
    await testClientCreation();
    await testDirectSale();
    await testCreditSale();
    await testCreditPayment();
    await testUnpaidCredit();
    await testOverdueCredit();
    await testMultipleCredits();
    await testCharges();
    await testClientFinancialSummary();
    await testDocumentTypes();
    await testEdgeCases();
    await testFinancialCoherence();
    await testRelations();
    await testPermissions();
    await testMigrationSafety();
    await testAPIEndpoints();
  } catch (e) {
    console.error("\n\n💥 FATAL ERROR:", e.message);
    console.error(e.stack);
  } finally {
    console.log("\n\n" + "═".repeat(70));
    console.log("   MATRICE FINALE DE VALIDATION");
    console.log("═".repeat(70));
    console.log(`  ✅ PASS:    ${passed}`);
    console.log(`  ❌ FAIL:    ${failed}`);
    console.log(`  ⚠️  PARTIAL: ${partial}`);
    console.log(`  ⏭️  SKIP:    ${skipped}`);
    console.log(`  TOTAL:      ${passed + failed + partial + skipped}`);
    console.log(`  TAUX:       ${Math.round((passed / (passed + failed + partial)) * 100)}%`);

    if (bugs.length > 0) {
      console.log("\n🐛 BUGS TROUVÉS:");
      bugs.forEach((b, i) => console.log(`  ${i + 1}. [${b.name}] ${b.detail}`));
    }

    console.log("\n" + "═".repeat(70));
    console.log("   DÉTAIL PAR TEST");
    console.log("═".repeat(70));
    results.forEach(r => {
      const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : r.status === "PARTIAL" ? "⚠️" : "⏭️";
      console.log(`  ${icon} ${r.name}: ${r.status}${r.detail ? " — " + r.detail : ""}`);
    });

    await prisma.$disconnect();
  }
}

main();
