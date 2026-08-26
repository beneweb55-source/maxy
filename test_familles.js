const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const produits = await prisma.produit.findMany({ select: { id: true, reference: true, categorie: true, lot_id: true } });
  console.log('Total produits:', produits.length);
  const refs = new Set(produits.map(p => p.reference.trim().toLowerCase()));
  console.log('Unique references:', refs.size);
  const refCat = new Set(produits.map(p => p.reference.trim().toLowerCase() + '|' + p.categorie.trim().toLowerCase()));
  console.log('Unique ref|cat:', refCat.size);
  const refCatLot = new Set(produits.map(p => p.reference.trim().toLowerCase() + '|' + p.categorie.trim().toLowerCase() + '|' + p.lot_id));
  console.log('Unique ref|cat|lot:', refCatLot.size);
  const nullRefs = produits.filter(p => !p.reference || p.reference.trim() === '');
  console.log('Produits sans reference:', nullRefs.length);
  const multiCatRefs = {};
  produits.forEach(p => {
    const r = p.reference.trim().toLowerCase();
    if (!multiCatRefs[r]) multiCatRefs[r] = new Set();
    multiCatRefs[r].add(p.categorie.trim().toLowerCase());
  });
  const collisions = Object.entries(multiCatRefs).filter(([r, c]) => c.size > 1);
  console.log('References dans plusieurs categories:', collisions.length);
  if (collisions.length > 0) console.log(collisions.slice(0,5).map(([r, c]) => r + ' -> ' + Array.from(c).join(', ')));
}
main().catch(console.error).finally(() => prisma.$disconnect());
