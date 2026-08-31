import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.categorie.findMany({
    include: {
      parent: {
        include: { parent: true }
      },
      _count: { select: { produits: true, modeles: true } }
    },
    orderBy: { id: "asc" }
  });

  const catTree = categories.map(c => ({
    id: c.id,
    nom: c.nom,
    parent_id: c.parent_id,
    path: [c.parent?.parent?.nom, c.parent?.nom, c.nom].filter(Boolean).join(" > "),
    produits: c._count.produits,
    modeles: c._count.modeles
  }));

  fs.writeFileSync("scratch/categories_dump.json", JSON.stringify(catTree, null, 2));
  console.log(`Exported ${catTree.length} categories.`);

  // Find products currently in POS / Terminaux & Caisses or similar
  const posProducts = await prisma.produit.findMany({
    where: {
      OR: [
        { categorie: { contains: "POS", mode: "insensitive" } },
        { categorie: { contains: "Terminal", mode: "insensitive" } },
        { categorie: { contains: "Caisse", mode: "insensitive" } },
        { categorie_rel: { nom: { contains: "Terminal", mode: "insensitive" } } },
        { categorie_rel: { nom: { contains: "Caisse", mode: "insensitive" } } },
        { categorie_rel: { parent: { nom: { contains: "POS", mode: "insensitive" } } } }
      ]
    },
    select: {
      id: true,
      code_interne: true,
      reference: true,
      categorie: true,
      categorie_id: true,
      modele: { select: { nom: true } }
    }
  });

  fs.writeFileSync("scratch/pos_products.json", JSON.stringify(posProducts, null, 2));
  console.log(`Found ${posProducts.length} POS products.`);
}

main().finally(() => prisma.$disconnect());
