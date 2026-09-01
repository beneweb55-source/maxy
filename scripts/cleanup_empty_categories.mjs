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

async function cleanup() {
  console.log("=== NETTOYAGE DES CATÉGORIES OBSOLÈTES À 0 PRODUITS ===");

  // Find all categories not belonging to the 9 validated families
  const obsoleteFamilies = await prisma.categorie.findMany({
    where: {
      parent_id: null,
      nom: { notIn: VALIDATED_FAMILIES }
    },
    include: {
      enfants: {
        include: {
          enfants: true,
        }
      }
    }
  });

  for (const f of obsoleteFamilies) {
    console.log(`Traitement ancienne famille obsolete: ${f.nom}`);
    
    // Collect all IDs
    const ids = [f.id];
    for (const c of f.enfants) {
      ids.push(c.id);
      for (const sc of c.enfants) {
        ids.push(sc.id);
      }
    }

    // Delete unused modeles
    await prisma.modele.deleteMany({
      where: {
        categorie_id: { in: ids },
        exemplaires: { none: {} }
      }
    });

    // Delete sub-levels
    for (const c of f.enfants) {
      for (const sc of c.enfants) {
        await prisma.categorie.delete({ where: { id: sc.id } });
      }
      await prisma.categorie.delete({ where: { id: c.id } });
    }
    await prisma.categorie.delete({ where: { id: f.id } });
  }

  // Update order for the 9 validated families
  for (let i = 0; i < VALIDATED_FAMILIES.length; i++) {
    await prisma.categorie.updateMany({
      where: { nom: VALIDATED_FAMILIES[i], parent_id: null },
      data: { ordre: i + 1 }
    });
  }

  console.log("Nettoyage terminé avec succès !");
  await prisma.$disconnect();
}

cleanup().catch(console.error);
