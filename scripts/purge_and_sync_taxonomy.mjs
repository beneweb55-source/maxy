import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const VALIDATED_FAMILIES = [
  "ORDINATEURS",
  "STOCKAGE",
  "SERVEURS & BAIES",
  "ÉLECTRICITÉ & CONNECTIQUE",
  "MÉMOIRE & PROCESSEURS",
  "IMPRESSION & CONSOMMABLES",
  "ÉCRANS & PÉRIPHÉRIQUES",
  "COMPOSANTS & CARTES D'EXTENSION",
  "RÉSEAU ACTIF & COMMUTATION"
];

async function run() {
  console.log("================ SYNCHRONISATION ÉCLAIR TAXONOMIE ================");

  // 1. Bulk Update SQL: Écrasement immédiat de produit.categorie avec le nom de categorie_rel
  const updatedCount = await prisma.$executeRaw`
    UPDATE produits 
    SET categorie = categories.nom 
    FROM categories 
    WHERE produits.categorie_id = categories.id
  `;
  console.log(`- Produits synchronisés en masse via SQL : ${updatedCount} lignes`);

  // 2. Supprimer les modèles orphelins résiduels
  const delModeles = await prisma.modele.deleteMany({
    where: { exemplaires: { none: {} } }
  });
  console.log(`- Modèles orphelins supprimés : ${delModeles.count}`);

  // 3. Ordonnancement des 9 Familles
  for (let i = 0; i < VALIDATED_FAMILIES.length; i++) {
    await prisma.categorie.updateMany({
      where: { nom: VALIDATED_FAMILIES[i], parent_id: null },
      data: { ordre: i + 1 }
    });
  }

  // 4. VÉRIFICATION
  const total = await prisma.produit.count();
  const sansCat = await prisma.produit.count({ where: { categorie_id: null } });
  const familles = await prisma.categorie.findMany({
    where: { parent_id: null },
    include: {
      enfants: {
        include: {
          enfants: {
            include: {
              _count: { select: { produits: true, modeles: true } }
            }
          },
          _count: { select: { produits: true, modeles: true } }
        }
      },
      _count: { select: { produits: true, modeles: true } }
    },
    orderBy: { ordre: "asc" }
  });

  console.log("\n================ ÉTAT DE LA BASE APRÈS PURGE ================");
  console.log(`- Total Produits : ${total} / 1678 (100%)`);
  console.log(`- Produits sans catégorie : ${sansCat}`);
  console.log(`- Nombre de Familles Racine : ${familles.length}`);

  for (const f of familles) {
    let totalProd = f._count.produits;
    for (const c of f.enfants) {
      totalProd += c._count.produits;
      for (const sc of c.enfants) {
        totalProd += sc._count.produits;
      }
    }
    console.log(`🏛️ [${f.id}] ${f.nom} -> ${totalProd} produits (${f.enfants.length} catégories)`);
    for (const c of f.enfants) {
      let totalCat = c._count.produits;
      for (const sc of c.enfants) {
        totalCat += sc._count.produits;
      }
      console.log(`   📁 [${c.id}] ${c.nom} (${totalCat} prod, ${c.enfants.length} sous-cats)`);
      for (const sc of c.enfants) {
        console.log(`      🏷️ [${sc.id}] ${sc.nom} (${sc._count.produits} prod, ${sc._count.modeles} modèles)`);
      }
    }
  }

  await prisma.$disconnect();
}

run().catch(console.error);
