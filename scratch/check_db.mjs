import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const produits = await prisma.produit.findMany({ take: 10 });
  console.log(produits.map(p => ({
    id: p.id,
    reference: p.reference,
    categorie: p.categorie,
    modele_id: p.modele_id
  })));
}

main().finally(() => prisma.$disconnect());
