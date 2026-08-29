import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { analyserGroupe } from '../lib/migration/moteur.js';

const prisma = new PrismaClient();

async function main() {
  console.log("=========================================");
  console.log("🚀 MIGRATION AUTOMATIQUE DE L'INVENTAIRE");
  console.log("=========================================\n");

  console.log("1. Analyse des produits existants...");
  
  // Grouper tous les produits qui n'ont pas encore de modèle
  const groupes = await prisma.produit.groupBy({
    by: ['categorie', 'reference'],
    where: { modele_id: null },
    _count: { _all: true }
  });

  console.log(`> ${groupes.length} groupes uniques (catégorie/référence) trouvés.\n`);

  let migres = 0;
  let ignorés = 0;

  for (const groupe of groupes) {
    const categorieLegacy = groupe.categorie;
    const referenceLegacy = groupe.reference;
    const nbProduits = groupe._count._all;

    // 1. Analyse IA / Moteur de règles
    const analyse = analyserGroupe(categorieLegacy, referenceLegacy, nbProduits);

    if (analyse.statut === "conflit" || analyse.confiance < 50 || !analyse.cible_famille_nom || !analyse.cible_categorie_nom) {
      console.log(`[IGNORÉ] ${categorieLegacy} / ${referenceLegacy} -> Confiance trop faible (${analyse.confiance}%) ou ambigu.`);
      ignorés += nbProduits;
      continue;
    }

    console.log(`[MIGRATION] ${categorieLegacy} / ${referenceLegacy} (${nbProduits} produits)`);
    console.log(`   -> Cible: ${analyse.cible_famille_nom} > ${analyse.cible_categorie_nom} > ${analyse.cible_modele_nom}`);

    // Transaction pour garantir l'intégrité
    await prisma.$transaction(async (tx) => {
      // 2. Trouver ou Créer la Famille (Niveau 1)
      let famille = await tx.categorie.findFirst({
        where: { nom: analyse.cible_famille_nom!, parent_id: null }
      });
      if (!famille) {
        famille = await tx.categorie.create({
          data: { nom: analyse.cible_famille_nom!, ordre: 0 }
        });
      }

      // 3. Trouver ou Créer la Catégorie (Niveau 2)
      let categorie = await tx.categorie.findFirst({
        where: { nom: analyse.cible_categorie_nom!, parent_id: famille.id }
      });
      if (!categorie) {
        categorie = await tx.categorie.create({
          data: { nom: analyse.cible_categorie_nom!, parent_id: famille.id, ordre: 0 }
        });
      }

      // 4. Trouver ou Créer le Modèle (Niveau 3)
      let modele = await tx.modele.findFirst({
        where: { nom: analyse.cible_modele_nom!, categorie_id: categorie.id }
      });
      if (!modele) {
        modele = await tx.modele.create({
          data: {
            nom: analyse.cible_modele_nom!,
            categorie_id: categorie.id,
            attributs: analyse.cible_attributs ?? undefined
          }
        });
      }

        await tx.produit.updateMany({
          where: {
            categorie: categorieLegacy,
            reference: referenceLegacy,
            modele_id: null
          },
          data: {
            modele_id: modele.id,
            categorie: analyse.cible_categorie_nom,
            reference: analyse.cible_modele_nom
          }
        });
    });

    migres += nbProduits;
  }

  console.log("\n=========================================");
  console.log("✅ MIGRATION TERMINÉE !");
  console.log(`Produits migrés avec succès : ${migres}`);
  console.log(`Produits nécessitant vérification manuelle : ${ignorés}`);
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("Erreur fatale:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
