import { PrismaClient } from '@prisma/client';
process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();

async function main() {
  try {
    const total = await prisma.produit.count();
    console.log("SUCCESS! Total produits:", total);
  } catch(e) {
    console.error("FAILED to connect:", e);
  }
}
main().finally(() => process.exit(0));
