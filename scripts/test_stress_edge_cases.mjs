import { PrismaClient } from "@prisma/client";
import { construireFiltresProduits } from "../lib/filtres-produits.ts";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function runStressTest() {
  console.log("================ STRESS TEST & EDGE CASES VERIFICATION ================");

  // 1. TEST PRODUITS ORPHELINS
  console.log("\n[TEST 1] Intégrité relationnelle & Produits orphelins :");
  const total = await prisma.produit.count();
  const sansCat = await prisma.produit.count({ where: { categorie_id: null } });
  const sansModele = await prisma.produit.count({ where: { modele_id: null } });
  
  if (sansCat > 0) throw new Error(`ÉCHEC: ${sansCat} produits sans categorie_id !`);
  if (sansModele > 0) throw new Error(`ÉCHEC: ${sansModele} produits sans modele_id !`);
  console.log(`✅ 100% des produits (${total}/${total}) ont une categorie_id et un modele_id valides.`);

  // 2. TEST SYNCHRONISATION DU TEXTE LEGACY
  console.log("\n[TEST 2] Synchronisation 'produit.categorie' vs 'categorie_rel.nom' :");
  const desynchronises = await prisma.produit.findMany({
    where: {
      NOT: {
        categorie: {
          equals: prisma.categorie.fields ? undefined : undefined // placeholder check
        }
      }
    },
    include: { categorie_rel: true }
  });
  const vraiDesync = desynchronises.filter(p => p.categorie_rel && p.categorie !== p.categorie_rel.nom);
  if (vraiDesync.length > 0) {
    throw new Error(`ÉCHEC: ${vraiDesync.length} produits ont un champ texte désynchronisé !`);
  }
  console.log(`✅ 100% des champs texte 'produit.categorie' sont parfaitement synchronisés.`);

  // 3. TEST CATÉGORIES SYSTÈME ET OBSOLÈTES
  console.log("\n[TEST 3] Absence de catégories système / debug exposées :");
  const debugCats = await prisma.categorie.findMany({
    where: {
      OR: [
        { nom: { contains: "DETERMINER", mode: "insensitive" } },
        { nom: { contains: "DEBUG", mode: "insensitive" } },
        { nom: { contains: "TEST", mode: "insensitive" } },
      ]
    }
  });
  if (debugCats.length > 0) {
    throw new Error(`ÉCHEC: Catégories système trouvées : ${debugCats.map(c => c.nom).join(", ")}`);
  }
  console.log(`✅ 0 catégorie système / debug présente.`);

  // 4. TEST DES 9 GRANDES FAMILLES
  console.log("\n[TEST 4] Structure des 9 Grandes Familles :");
  const familles = await prisma.categorie.findMany({ where: { parent_id: null }, orderBy: { ordre: "asc" } });
  if (familles.length !== 9) {
    throw new Error(`ÉCHEC: Attendu 9 familles racine, trouvé: ${familles.length}`);
  }
  console.log(`✅ Exactement 9 familles racine : ${familles.map(f => f.nom).join(", ")}`);

  // 5. TEST STRESS DES FILTRES & RECHERCHE (Edge cases)
  console.log("\n[TEST 5] Stress test des requêtes et filtres backend :");
  
  const testCases = [
    { name: "Recherche normale 'OptiPlex'", params: new URLSearchParams({ q: "OptiPlex" }) },
    { name: "Recherche sous-catégorie 'Mini PC'", params: new URLSearchParams({ q: "Mini PC" }) },
    { name: "Recherche avec caractères spéciaux '2,5\" / SAS'", params: new URLSearchParams({ q: "2,5\"" }) },
    { name: "Filtre famille existante (ORDINATEURS)", params: new URLSearchParams({ famille_id: String(familles[0].id) }) },
    { name: "Filtre famille inexistante (ID 999999)", params: new URLSearchParams({ famille_id: "999999" }) },
    { name: "Filtre avec lettres dans l'ID (ID 'abc')", params: new URLSearchParams({ famille_id: "abc" }) },
    { name: "Recherche avec espaces multiples", params: new URLSearchParams({ q: "   HP    EliteDesk   " }) },
  ];

  for (const tc of testCases) {
    try {
      const where = construireFiltresProduits(tc.params);
      const count = await prisma.produit.count({ where });
      console.log(`  - [PASS] ${tc.name} -> ${count} résultats trouvés sans erreur.`);
    } catch (err) {
      throw new Error(`ÉCHEC sur le cas "${tc.name}": ${err.message}`);
    }
  }

  console.log("\n🎉 TOUS LES TESTS DE STRESS ET D'INTÉGRITÉ ONT RÉUSSI AVEC SUCCÈS !");
  await prisma.$disconnect();
}

runStressTest().catch((err) => {
  console.error("\n❌ ERREUR LORS DU STRESS TEST:", err);
  process.exit(1);
});
