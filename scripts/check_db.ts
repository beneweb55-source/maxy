import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Produit' OR table_name = 'produits';
    `;
    console.log(result);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
