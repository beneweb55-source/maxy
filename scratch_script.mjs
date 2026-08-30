import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() { 
  const withCat = await prisma.produit.count({ where: { categorie_id: { not: null } } }); 
  const withMod = await prisma.produit.count({ where: { modele_id: { not: null } } }); 
  console.log({withCat, withMod}); 
} 
main().finally(() => prisma.$disconnect());
