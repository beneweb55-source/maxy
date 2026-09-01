import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const produits = await prisma.produit.count();
  const lots = await prisma.lot.count();
  const categories = await prisma.categorie.count();
  const modeles = await prisma.modele.count();
  const ventes = await prisma.vente.count();

  console.log({ users, produits, lots, categories, modeles, ventes });

  const allProduits = await prisma.produit.findMany({
    select: {
      id: true,
      code_interne: true,
      reference: true,
      categorie: true,
      categorie_id: true,
      statut: true,
    }
  });
  console.log("Exemple de produits en base:", allProduits.slice(0, 10));
}

main().finally(() => prisma.$disconnect());
