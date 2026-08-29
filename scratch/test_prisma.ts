import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();

async function main() {
  const produits = await prisma.produit.findMany({
    take: 5,
    select: {
      id: true, reference: true, categorie: true, categorie_id: true,
      categorie_rel: { select: { nom: true, parent: { select: { nom: true, parent: { select: { nom: true } } } } } },
    }
  });
  console.log(JSON.stringify(produits, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
