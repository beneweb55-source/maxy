import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.produit.groupBy({ by: ['categorie'], _count: true, where: { categorie_id: null }, orderBy: { _count: { categorie: 'desc' } } });
  console.log(p);
}
main().finally(() => prisma.$disconnect());
