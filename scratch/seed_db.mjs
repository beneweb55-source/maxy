import { PrismaClient } from '@prisma/client';
import fs from 'fs';

process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();

async function main() {
  await prisma.produit.deleteMany({});
  
  const csv = fs.readFileSync('scratch/snapshot_produits.csv', 'utf-8');
  const lines = csv.split('\n').slice(1).filter(l => l.trim());
  
  let inserted = 0;
  for (const line of lines) {
    const match = line.match(/^(\d+),"(.+)","(.+)"$/);
    if (!match) continue;
    const [, idStr, ref, cat] = match;
    const id = Number(idStr);
    
    // Strip zero width spaces and unsupported chars
    const cleanRef = ref.replace(/""/g, '"').replace(/\u200B/g, '').replace(/—/g, '-');
    const cleanCat = cat.replace(/""/g, '"').replace(/\u200B/g, '').replace(/—/g, '-');

    await prisma.produit.create({
      data: {
        id: id,
        reference: cleanRef,
        categorie: cleanCat,
        code_interne: `MIG-${id}`,
        prix_achat: 0,
        statut: 'ok',
      }
    });
    inserted++;
  }
  
  console.log(`Successfully seeded ${inserted} products!`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
