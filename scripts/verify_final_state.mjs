import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verify() {
  console.log("=== VÉRIFICATION DE LA BASE DE DONNÉES ===");

  let totalProduits = 0;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      totalProduits = await prisma.produit.count();
      break;
    } catch (e) {
      console.log(`Tentative ${attempt}/5: réveil Neon...`);
      await sleep(2000);
    }
  }

  const produitsClasses = await prisma.produit.count({ where: { categorie_id: { not: null } } });
  const produitsModeles = await prisma.produit.count({ where: { modele_id: { not: null } } });

  const totalFamilles = await prisma.categorie.count({ where: { parent_id: null } });
  const totalCategories = await prisma.categorie.count({ where: { parent: { parent_id: null } } });
  const totalSousCategories = await prisma.categorie.count({ where: { parent: { parent: { parent_id: null } } } });
  const totalModeles = await prisma.modele.count();

  console.log(`- Total Produits en base : ${totalProduits}`);
  console.log(`- Produits rattachés à une Catégorie : ${produitsClasses} / ${totalProduits} (${((produitsClasses/totalProduits)*100).toFixed(2)}%)`);
  console.log(`- Produits rattachés à un Modèle : ${produitsModeles} / ${totalProduits} (${((produitsModeles/totalProduits)*100).toFixed(2)}%)`);
  console.log(`- Grandes Familles (Niveau 1) : ${totalFamilles}`);
  console.log(`- Catégories (Niveau 2) : ${totalCategories}`);
  console.log(`- Sous-catégories (Niveau 3) : ${totalSousCategories}`);
  console.log(`- Modèles uniques créés : ${totalModeles}`);

  const familles = await prisma.categorie.findMany({
    where: { parent_id: null },
    include: {
      enfants: {
        include: {
          enfants: {
            include: {
              _count: { select: { produits: true } }
            }
          },
          _count: { select: { produits: true } }
        }
      },
      _count: { select: { produits: true } }
    },
    orderBy: { ordre: "asc" }
  });

  console.log("\n=== DÉTAIL DES 9 GRANDES FAMILLES ===");
  for (const f of familles) {
    let total = f._count.produits;
    for (const c of f.enfants) {
      total += c._count.produits;
      for (const sc of c.enfants) {
        total += sc._count.produits;
      }
    }
    console.log(`📦 [${f.nom}] : ${total} produits (${f.enfants.length} catégories)`);
  }

  await prisma.$disconnect();
}

verify().catch(console.error);
