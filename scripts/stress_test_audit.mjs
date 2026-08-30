import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function audit() {
  console.log("================ STRESS TEST & AUDIT INVENTAIRE ================");

  // 1. Produits orphelins (categorie_id NULL ou pointant vers un ID inexistant)
  const totalProduits = await prisma.produit.count();
  const sansCategorieId = await prisma.produit.count({ where: { categorie_id: null } });
  
  const allCategories = await prisma.categorie.findMany({ select: { id: true } });
  const validCatIds = new Set(allCategories.map(c => c.id));
  
  const produits = await prisma.produit.findMany({
    select: { id: true, code_interne: true, reference: true, categorie: true, categorie_id: true, modele_id: true }
  });

  const orphelinsIdInvalide = produits.filter(p => p.categorie_id !== null && !validCatIds.has(p.categorie_id));
  const orphelinsSansModele = produits.filter(p => p.modele_id === null);

  console.log(`\n1. VÉRIFICATION PRODUITS ORPHELINS :`);
  console.log(`- Total produits: ${totalProduits}`);
  console.log(`- Produits avec categorie_id NULL: ${sansCategorieId}`);
  console.log(`- Produits avec categorie_id invalide (clé cassée): ${orphelinsIdInvalide.length}`);
  console.log(`- Produits sans modele_id: ${orphelinsSansModele.length}`);

  // 2. Conflits de casse & anciens champs string legacy
  console.log(`\n2. AUDIT DES ANCIENNES CATÉGORIES STRING (produit.categorie) :`);
  const stringsLegacy = {};
  for (const p of produits) {
    stringsLegacy[p.categorie] = (stringsLegacy[p.categorie] || 0) + 1;
  }
  console.log(stringsLegacy);

  // 3. Catégories système / debug exposées
  console.log(`\n3. AUDIT DES CATÉGORIES SYSTÈME / DEBUG :`);
  const categoriesSysteme = await prisma.categorie.findMany({
    where: {
      OR: [
        { nom: { contains: "DETERMINER", mode: "insensitive" } },
        { nom: { contains: "DEBUG", mode: "insensitive" } },
        { nom: { contains: "TEST", mode: "insensitive" } },
        { nom: { contains: "INCONNU", mode: "insensitive" } },
        { nom: { contains: "NON CLASSE", mode: "insensitive" } },
        { nom: { contains: "AUTRE", mode: "insensitive" } },
      ]
    }
  });
  console.log(`- Catégories de debug/système trouvées: ${categoriesSysteme.length}`);
  if (categoriesSysteme.length > 0) {
    console.log(categoriesSysteme.map(c => ({ id: c.id, nom: c.nom, parent_id: c.parent_id })));
  }

  // 4. Arborescence 4 Niveaux
  console.log(`\n4. ARBORESCENCE ACTUELLE :`);
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

  console.log(`Total Familles Racine: ${familles.length}`);
  for (const f of familles) {
    console.log(`\n🏛️ FAMILLE [${f.id}] ${f.nom} (ordre: ${f.ordre})`);
    for (const c of f.enfants) {
      console.log(`   📁 CATÉGORIE [${c.id}] ${c.nom} (${c._count.produits} prod directs, ${c.enfants.length} sous-cats)`);
      for (const sc of c.enfants) {
        console.log(`      🏷️ SOUS-CAT [${sc.id}] ${sc.nom} (${sc._count.produits} prod, ${sc._count.modeles} modeles)`);
      }
    }
  }

  await prisma.$disconnect();
}

audit().catch(console.error);
