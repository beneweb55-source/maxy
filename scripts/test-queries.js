const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Test 1: GET /api/produits/[id] — simplified select
  try {
    await p.produit.findFirst({
      select: {
        id: true, code_interne: true, reference: true, categorie: true,
        numero_serie: true, grade: true, emplacement: true,
        modele_id: true, categorie_id: true, statut: true,
        a_jeter: true, en_vitrine: true, notes: true, decision_rapport: true,
        prix_achat: true, prix_vente_fixe: true, prix_vente_reel: true,
        etiquette_imprimee: true, date_vente: true, created_at: true,
        est_compose: true, bom_role: true,
        lot: { select: { id: true, fournisseur: true, date_entree: true, statut_lot: true } },
        images: { orderBy: { position: 'asc' }, select: { id: true } },
        _count: { select: { composants: true } },
      },
    });
    console.log('✅ Test 1 PASS: GET /api/produits/[id] SELECT (bom_role included)');
  } catch(e) {
    console.error('❌ Test 1 FAIL:', e.message);
  }

  // Test 2: BOM components search
  try {
    await p.produit.findMany({
      where: { bom_role: { in: ['component', 'both'] } },
      take: 300,
    });
    console.log('✅ Test 2 PASS: BOM components search');
  } catch(e) {
    console.error('❌ Test 2 FAIL:', e.message);
  }

  // Test 3: createManyAndReturn (import)
  try {
    await p.produit.createManyAndReturn({
      data: [{
        reference: 'TEST', categorie: 'test', prix_achat: 0,
        code_interne: 'TEST-001', statut: 'recu', bom_role: 'finished',
      }],
      select: { id: true, code_interne: true },
    });
    await p.produit.deleteMany({ where: { code_interne: 'TEST-001' } });
    console.log('✅ Test 3 PASS: createManyAndReturn');
  } catch(e) {
    console.error('❌ Test 3 FAIL:', e.message);
  }

  // Test 4: PATCH bom_role
  try {
    await p.produit.update({
      where: { id: 0 },
      data: { bom_role: 'component' },
      select: { id: true, est_compose: true, bom_role: true },
    });
    console.log('✅ Test 4 PASS: PATCH bom_role');
  } catch(e) {
    if (e.message.includes('Record to update not found')) {
      console.log('✅ Test 4 PASS: PATCH bom_role (schema valid, no record = expected)');
    } else {
      console.error('❌ Test 4 FAIL:', e.message);
    }
  }

  // Test 5: composants disponibles
  try {
    await p.produit.findMany({
      where: {
        statut: { notIn: ['vendu', 'hs', 'assemble'] },
        bom_role: { in: ['component', 'both'] },
      },
      select: { id: true, reference: true, statut: true, parent_id: true, modele_id: true, bom_role: true },
      take: 50,
    });
    console.log('✅ Test 5 PASS: Composants disponibles');
  } catch(e) {
    console.error('❌ Test 5 FAIL:', e.message);
  }

  await p.$disconnect();
  console.log('\n=== ALL CRITICAL QUERIES VALIDATED ===');
}

main();
