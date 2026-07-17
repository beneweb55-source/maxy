import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { username: true, role: true } });
  const lots = await prisma.lot.findMany({ select: { id: true, statut_lot: true, quantite_attendue: true, _count: { select: { produits: true } } } });
  const produits = await prisma.produit.count();
  console.log("USERS:", JSON.stringify(users));
  console.log("LOTS:", JSON.stringify(lots));
  console.log("PRODUITS:", produits);
  await prisma.$disconnect();
}
main();
