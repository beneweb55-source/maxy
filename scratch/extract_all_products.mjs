// Extract ALL products from DB for deep audit
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const produits = await prisma.produit.findMany({
    select: {
      id: true,
      code_interne: true,
      reference: true,
      categorie: true,
      notes: true,
      statut: true,
      prix_achat: true,
      categorie_id: true,
      modele_id: true,
      modele: { select: { id: true, nom: true, categorie: { select: { id: true, nom: true, parent: { select: { id: true, nom: true, parent: { select: { id: true, nom: true } } } } } } } }
    },
    orderBy: [{ categorie: 'asc' }, { reference: 'asc' }]
  });
  
  const categories = await prisma.categorie.findMany({
    include: {
      enfants: { include: { enfants: true, _count: { select: { modeles: true } } } },
      _count: { select: { modeles: true } }
    },
    where: { parent_id: null },
    orderBy: { nom: 'asc' }
  });
  
  const legacyCats = await prisma.produit.groupBy({
    by: ['categorie'],
    _count: true,
    orderBy: { _count: { categorie: 'desc' } }
  });

  const output = {
    total_produits: produits.length,
    legacy_categories: legacyCats.map(c => ({ categorie: c.categorie, count: c._count })),
    category_tree: categories,
    produits_par_categorie: {}
  };
  
  for (const p of produits) {
    const cat = p.categorie || '(sans catégorie)';
    if (!output.produits_par_categorie[cat]) output.produits_par_categorie[cat] = [];
    output.produits_par_categorie[cat].push({
      id: p.id,
      code: p.code_interne,
      ref: p.reference,
      notes: p.notes ? p.notes.substring(0, 200) : null,
      statut: p.statut,
      prix: p.prix_achat,
      categorie_id: p.categorie_id,
      modele: p.modele ? { id: p.modele.id, nom: p.modele.nom } : null
    });
  }
  
  const fs = await import('fs');
  fs.writeFileSync(
    'scratch/full_inventory_dump.json',
    JSON.stringify(output, null, 2)
  );
  
  console.log(`Total produits: ${produits.length}`);
  console.log(`Catégories legacy distinctes: ${legacyCats.length}`);
  console.log(`Familles dans l'arbre: ${categories.length}`);
  
  for (const [cat, prods] of Object.entries(output.produits_par_categorie)) {
    console.log(`\n--- ${cat} (${prods.length} produits) ---`);
    for (const p of prods) {
      console.log(`  [${p.code}] ${p.ref}`);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
