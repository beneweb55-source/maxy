import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.produit.count();
  console.log(`Total produits dans DB : ${count}`);
  
  const p = await prisma.produit.findFirst();
  console.log(p);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
