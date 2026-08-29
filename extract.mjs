import { PrismaClient } from '@prisma/client';
import fs from 'fs';
process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();
async function main() {
  try {
    const data = await prisma.produit.groupBy({ by: ['categorie', 'reference'], _count: { _all: true } });
    fs.writeFileSync('temp_categories.json', JSON.stringify(data, null, 2));
    console.log("Extraction done: " + data.length + " categories");
  } catch(e) {
    console.error("ERREUR:", e);
  }
}
main().finally(() => process.exit(0));
