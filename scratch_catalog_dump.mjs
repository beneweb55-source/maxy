import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.produit.findMany({
    select: {
      categorie: true,
      reference: true,
      code_interne: true,
      statut: true
    }
  });

  // Grouping by Categorie -> Reference
  const catalog = {};
  
  for (const p of products) {
    if (!catalog[p.categorie]) catalog[p.categorie] = {};
    if (!catalog[p.categorie][p.reference]) catalog[p.categorie][p.reference] = { count: 0, items: [] };
    
    catalog[p.categorie][p.reference].count++;
    if (catalog[p.categorie][p.reference].items.length < 2) {
      catalog[p.categorie][p.reference].items.push(p.code_interne);
    }
  }
  
  // Sort and format for readability
  const sortedCatalog = Object.entries(catalog)
    .sort((a, b) => {
      const countA = Object.values(a[1]).reduce((sum, ref) => sum + ref.count, 0);
      const countB = Object.values(b[1]).reduce((sum, ref) => sum + ref.count, 0);
      return countB - countA;
    });

  let output = "# Catalogue Actuel des Produits\n\n";
  
  for (const [catName, refs] of sortedCatalog) {
    const totalInCat = Object.values(refs).reduce((sum, ref) => sum + ref.count, 0);
    output += `## Catégorie: ${catName} (${totalInCat} produits)\n`;
    
    const sortedRefs = Object.entries(refs).sort((a, b) => b[1].count - a[1].count);
    
    for (const [refName, data] of sortedRefs) {
      output += `- Ref: ${refName} (${data.count} produits) [Ex: ${data.items.join(', ')}]\n`;
    }
    output += "\n";
  }

  fs.writeFileSync('C:\\Users\\SamyLARABE\\.gemini\\antigravity-ide\\brain\\e2917f96-0e22-4aee-9d15-bebaec80d4f6\\scratch\\catalog_dump.md', output);
  console.log("Dump saved to catalog_dump.md");
}

main().finally(() => prisma.$disconnect());
