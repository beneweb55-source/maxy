import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function executerDryRun() {
  console.log("=== NOUVEAU DRY-RUN : CLASSIFICATION & STATUT COMPOSÉ ===\n");

  // =========================================================================
  // PARTIE A : DÉTECTION DU STATUT COMPOSÉ (Basé UNIQUEMENT sur les données fiables)
  // =========================================================================
  console.log("--- PARTIE A : DÉTECTION DU STATUT COMPOSÉ ---");
  
  // Produits qui ont déjà des composants (Fiable à 100%)
  const produitsAvecComposants = await prisma.produit.findMany({
    where: {
      composants: {
        some: {}
      }
    },
    include: {
      _count: {
        select: { composants: true }
      }
    }
  });

  console.log(`Produits identifiés avec certitude comme composés (ont des composants) : ${produitsAvecComposants.length}`);
  
  // Produits simples par défaut (sans composants, et non marqués comme composés)
  // On ne peut pas affirmer qu'ils sont simples ou composés juste par le nom.
  const autresProduits = await prisma.produit.count({
    where: {
      composants: {
        none: {}
      }
    }
  });

  console.log(`Produits ambigus/simples (sans composants existants) : ${autresProduits}`);
  console.log("=> ACTION PROPOSÉE : Aucune modification automatique du statut composé. Le statut sera défini par l'utilisateur lors de la création ou lorsqu'il ajoute un composant.\n");


  // =========================================================================
  // PARTIE B : CLASSIFICATION DES CATÉGORIES (RAM, ALIMENTATIONS, ETC.)
  // =========================================================================
  console.log("--- PARTIE B : CLASSIFICATION DES CATÉGORIES ---");
  console.log("Règle : Toute classification incertaine aura une confiance LOW et ne sera pas modifiée.\n");

  // Récupérer toutes les catégories actuelles pour analyse
  const produitsAClassifier = await prisma.produit.findMany({
    where: {
      OR: [
        { categorie: { contains: "RAM", mode: "insensitive" } },
        { categorie: { contains: "Alimentation", mode: "insensitive" } },
        { categorie: { contains: "UDIMM", mode: "insensitive" } },
        { categorie: { contains: "SODIMM", mode: "insensitive" } },
      ]
    },
    select: {
      id: true,
      reference: true,
      categorie: true,
    }
  });

  let highConfidenceCount = 0;
  let lowConfidenceCount = 0;

  for (const p of produitsAClassifier) {
    let propose = "";
    let raison = "";
    let confiance = "LOW";
    const refUpper = p.reference.toUpperCase();
    const catUpper = p.categorie.toUpperCase();

    // 1. Logique RAM
    if (catUpper.includes("RAM") || catUpper.includes("DIMM")) {
      const isSodimm = refUpper.includes("SODIMM") || refUpper.includes("SO-DIMM") || catUpper.includes("SODIMM");
      const isUdimm = refUpper.includes("UDIMM") || catUpper.includes("UDIMM") || refUpper.includes("DESKTOP") || (!isSodimm && refUpper.includes("PC4-"));
      const isEcc = refUpper.includes("ECC") || catUpper.includes("ECC") || refUpper.includes("RDIMM");

      if (isEcc) {
        propose = "RAM Serveur (ECC/RDIMM)";
        raison = "Mention ECC ou RDIMM détectée dans la référence ou catégorie.";
        confiance = "HIGH";
      } else if (isSodimm) {
        propose = "RAM SODIMM -> Laptop / Mini PC";
        raison = "Mention SODIMM détectée.";
        confiance = "HIGH";
      } else if (isUdimm) {
        propose = "RAM UDIMM -> PC Desktop";
        raison = "Mention UDIMM ou form-factor Desktop détecté.";
        confiance = "HIGH";
      } else {
        propose = "RAM (Inconnue)";
        raison = "Pas assez de mots-clés pour déduire le form-factor (UDIMM/SODIMM).";
        confiance = "LOW";
      }
    }

    // 2. Logique Alimentation
    else if (catUpper.includes("ALIMENTATION") || catUpper.includes("POWER SUPPLY")) {
      if (refUpper.includes("ATX") || refUpper.includes("BRONZE") || refUpper.includes("GOLD") || refUpper.includes("80+")) {
        propose = "Alimentation -> PC Desktop";
        raison = "Format ATX ou certification 80+ classique détectée.";
        confiance = "HIGH";
      } else if (refUpper.includes("SERVER") || refUpper.includes("HOT PLUG") || refUpper.includes("REDUNDANT")) {
        propose = "Alimentation -> Serveur";
        raison = "Mention Serveur, Hot-plug ou redondance détectée.";
        confiance = "HIGH";
      } else if (refUpper.includes("ADAPTER") || refUpper.includes("CHARGEUR") || refUpper.includes("AC") || refUpper.includes("BRICK")) {
        propose = "Alimentation -> Laptop / Mini PC (Externe)";
        raison = "Format adaptateur externe détecté.";
        confiance = "HIGH";
      } else {
        propose = "Alimentation (Inconnue)";
        raison = "Format non identifiable par la référence.";
        confiance = "LOW";
      }
    }

    if (confiance === "HIGH") {
      highConfidenceCount++;
    } else {
      lowConfidenceCount++;
    }

    // Afficher quelques exemples (max 15 pour pas polluer)
    if (highConfidenceCount <= 10 || (confiance === "LOW" && lowConfidenceCount <= 5)) {
      console.log(`[ID ${p.id}] ${p.reference}`);
      console.log(`Actuel : ${p.categorie}`);
      console.log(`Proposé : ${propose}`);
      console.log(`Raison : ${raison}`);
      console.log(`Confiance : ${confiance}\n`);
    }
  }

  console.log(`\n--- RÉSUMÉ PARTIE B ---`);
  console.log(`Produits analysés : ${produitsAClassifier.length}`);
  console.log(`Classifications HIGH confidence (sûres) : ${highConfidenceCount}`);
  console.log(`Classifications LOW confidence (incertaines, ignorées) : ${lowConfidenceCount}`);
  
  console.log("\n=== FIN DU DRY-RUN ===");
  console.log("Aucune modification n'a été effectuée en base de données.");
}

executerDryRun()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
