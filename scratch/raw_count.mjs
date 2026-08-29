import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();
async function main() {
  const res = await prisma.$queryRaw`SELECT count(*) FROM produits`;
  console.log(res);
}
main().finally(() => prisma.$disconnect());
