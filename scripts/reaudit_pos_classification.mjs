import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const execute = process.argv.includes("--execute");
  console.log("================================================================================");
  console.log(`🔍 AUDIT & RECLASSEMENT DE MASSE - BASE DE DONNÉES MAXY`);
  console.log(`MODE : ${execute ? "⚡ EXÉCUTION RÉELLE (--execute)" : "🧪 SIMULATION (DRY-RUN)"}`);
  console.log("================================================================================\n");

  // 1. Catégories cibles
  // A. ÉCRANS & PÉRIPHÉRIQUES > Accessoires Écrans > Supports & Bras Articulés (ID 135)
  const catSupports = await prisma.categorie.findFirst({
    where: { nom: "Supports & Bras Articulés" }
  });

  // B. ORDINATEURS > Matériel Point de Vente (POS) > Terminaux & Caisses (ID 88)
  const catPOS = await prisma.categorie.findFirst({
    where: { nom: "Terminaux & Caisses" }
  });

  // C. COMPOSANTS & CARTES D'EXTENSION > Contrôleurs & Cartes Spécifiques > Contrôleurs RAID, HBA & Risers (ID 143)
  const catRAID = await prisma.categorie.findFirst({
    where: { nom: "Contrôleurs RAID, HBA & Risers" }
  });

  // D. SERVEURS & BAIES > Accessoires de Baies & Châssis > Blocs d'Alimentation Serveur (PSU)
  let catAlimServeur = await prisma.categorie.findFirst({
    where: { nom: "Blocs d'Alimentation Serveur (PSU)" }
  });

  if (!catAlimServeur) {
    let parentBaies = await prisma.categorie.findFirst({ where: { nom: "Accessoires de Baies & Châssis" } });
    if (!parentBaies) {
      let familleServeurs = await prisma.categorie.findFirst({ where: { nom: "SERVEURS & BAIES" } });
      if (!familleServeurs) {
        familleServeurs = await prisma.categorie.create({ data: { nom: "SERVEURS & BAIES", ordre: 3 } });
      }
      parentBaies = await prisma.categorie.create({
        data: { nom: "Accessoires de Baies & Châssis", parent_id: familleServeurs.id, ordre: 2 }
      });
    }
    if (execute) {
      catAlimServeur = await prisma.categorie.create({
        data: { nom: "Blocs d'Alimentation Serveur (PSU)", parent_id: parentBaies.id, ordre: 2 }
      });
    } else {
      catAlimServeur = { id: 9991, nom: "Blocs d'Alimentation Serveur (PSU)" };
    }
  }

  // E. COMPOSANTS & CARTES D'EXTENSION > Refroidissement & Châssis > Refroidissement & Ventilateurs
  let catVentilation = await prisma.categorie.findFirst({
    where: { nom: "Refroidissement & Ventilateurs" }
  });

  if (!catVentilation) {
    let parentComposants = await prisma.categorie.findFirst({ where: { nom: "COMPOSANTS & CARTES D'EXTENSION" } });
    if (!parentComposants) {
      parentComposants = await prisma.categorie.create({ data: { nom: "COMPOSANTS & CARTES D'EXTENSION", ordre: 6 } });
    }
    let catIntermediaire = await prisma.categorie.findFirst({
      where: { nom: "Refroidissement & Châssis", parent_id: parentComposants.id }
    });
    if (!catIntermediaire && execute) {
      catIntermediaire = await prisma.categorie.create({
        data: { nom: "Refroidissement & Châssis", parent_id: parentComposants.id, ordre: 3 }
      });
    }
    if (execute && catIntermediaire) {
      catVentilation = await prisma.categorie.create({
        data: { nom: "Refroidissement & Ventilateurs", parent_id: catIntermediaire.id, ordre: 1 }
      });
    } else {
      catVentilation = { id: 9992, nom: "Refroidissement & Ventilateurs" };
    }
  }

  // 2. Extraire tous les produits
  const tousProduits = await prisma.produit.findMany({
    include: {
      categorie_rel: {
        include: {
          parent: {
            include: { parent: true }
          }
        }
      },
      modele: true
    },
    orderBy: { id: "asc" }
  });

  console.log(`📦 Nombre total de produits analysés : ${tousProduits.length}\n`);

  const deplacements = [];
  const terminauxValides = [];

  for (const p of tousProduits) {
    const ref = (p.reference || "").trim();
    const mod = (p.modele?.nom || "").trim();
    const texte = `${ref} ${mod}`.toLowerCase();
    const ancienneCat = p.categorie_rel?.nom || p.categorie || "Non défini";
    const ancienChemin = [
      p.categorie_rel?.parent?.parent?.nom,
      p.categorie_rel?.parent?.nom,
      p.categorie_rel?.nom || p.categorie
    ].filter(Boolean).join(" > ");

    let cible = null;

    // RÈGLE 1 : Supports & Bras d'écran
    if (
      texte.includes("aisens") ||
      texte.includes("desk mount") ||
      texte.includes("monitor desk mount") ||
      (texte.includes("support") && (texte.includes("ecran") || texte.includes("écran") || texte.includes("mount") || texte.includes("bras")))
    ) {
      if (p.categorie_id !== catSupports?.id) {
        cible = {
          id: catSupports?.id,
          nom: catSupports?.nom || "Supports & Bras Articulés",
          chemin: "ÉCRANS & PÉRIPHÉRIQUES > Accessoires Écrans > Supports & Bras Articulés",
          raison: "Support d'écran articulé / Desk Mount (AISENS)"
        };
      }
    }
    // RÈGLE 2 : Blocs d'alimentation serveur (PSU)
    else if (
      texte.includes("800w") ||
      texte.includes("psu") ||
      texte.includes("blocs d'alimentation") ||
      texte.includes("bloc d'alimentation") ||
      (texte.includes("alimentation") && (texte.includes("serveur") || texte.includes("server"))) ||
      texte.includes("power supply")
    ) {
      if (p.categorie_id !== catAlimServeur?.id) {
        cible = {
          id: catAlimServeur?.id,
          nom: catAlimServeur?.nom || "Blocs d'Alimentation Serveur (PSU)",
          chemin: "SERVEURS & BAIES > Accessoires de Baies & Châssis > Blocs d'Alimentation Serveur (PSU)",
          raison: "Bloc d'alimentation serveur 800W / PSU"
        };
      }
    }
    // RÈGLE 3 : Ventilation, ventilateurs & refroidissement
    else if (
      texte.includes("ventilation") ||
      texte.includes("ventilateur") ||
      texte.includes("sunon") ||
      texte.includes("ultraflo") ||
      texte.includes("heatsink") ||
      texte.includes("dissipateur")
    ) {
      if (p.categorie_id !== catVentilation?.id) {
        cible = {
          id: catVentilation?.id,
          nom: catVentilation?.nom || "Refroidissement & Ventilateurs",
          chemin: "COMPOSANTS & CARTES D'EXTENSION > Refroidissement & Châssis > Refroidissement & Ventilateurs",
          raison: "Module de ventilation / Ventilateurs SUNON / Dissipateur"
        };
      }
    }
    // RÈGLE 4 : Contrôleurs RAID / Smart Array / HBA
    else if (
      (texte.includes("smart array") || texte.includes("microsemi") || texte.includes("raid controller") || texte.includes("carte raid")) &&
      !texte.includes("workstation") &&
      !texte.includes("pos")
    ) {
      if (catRAID && p.categorie_id !== catRAID.id) {
        cible = {
          id: catRAID.id,
          nom: catRAID.nom,
          chemin: "COMPOSANTS & CARTES D'EXTENSION > Contrôleurs & Cartes Spécifiques > Contrôleurs RAID, HBA & Risers",
          raison: "Contrôleur RAID / Smart Array PCIe"
        };
      }
    }
    // RÈGLE 5 : Terminaux & Caisses POS réels
    else if (
      texte.includes("aures") ||
      texte.includes("yuno") ||
      texte.includes("thinksmart") ||
      texte.includes("micros compact") ||
      texte.includes("micros workstation") ||
      texte.includes("oracle micros") ||
      texte.includes("express station") ||
      texte.includes("touchscreen pos") ||
      (texte.includes("pos terminal") && !texte.includes("mount"))
    ) {
      if (catPOS && p.categorie_id !== catPOS.id) {
        cible = {
          id: catPOS.id,
          nom: catPOS.nom,
          chemin: "ORDINATEURS > Matériel Point de Vente (POS) > Terminaux & Caisses",
          raison: "Terminal de Point de Vente (POS) / Caisse tactile"
        };
      } else {
        terminauxValides.push({
          id: p.id,
          code_interne: p.code_interne,
          reference: p.reference,
          categorie: ancienneCat
        });
      }
    }

    if (cible) {
      deplacements.push({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        modele_id: p.modele_id,
        ancienneCat,
        ancienChemin,
        nouvelleCatId: cible.id,
        nouvelleCatNom: cible.nom,
        nouveauChemin: cible.chemin,
        raison: cible.raison
      });
    }
  }

  // Affichage du rapport
  console.log(`📋 NOMBRE DE PRODUITS À RECLASSER : ${deplacements.length}`);
  console.log("--------------------------------------------------------------------------------");
  for (const d of deplacements) {
    console.log(`[ID ${d.id} | ${d.code_interne}] ${d.reference}`);
    console.log(`   🔴 De : ${d.ancienChemin}`);
    console.log(`   🟢 Vers : ${d.nouveauChemin}`);
    console.log(`   💡 Motif : ${d.raison}\n`);
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`✅ TERMINAUX ET CAISSES VÉRITABLES RESTANTS DÉJÀ BIEN CLASSÉS (${terminauxValides.length}) :`);
  for (const t of terminauxValides) {
    console.log(`   - [${t.code_interne}] ${t.reference}`);
  }
  console.log("--------------------------------------------------------------------------------\n");

  if (execute) {
    console.log("💾 Application des modifications en base de données...");
    let modifies = 0;

    for (const d of deplacements) {
      await prisma.produit.update({
        where: { id: d.id },
        data: {
          categorie_id: d.nouvelleCatId,
          categorie: d.nouvelleCatNom
        }
      });

      if (d.modele_id) {
        await prisma.modele.update({
          where: { id: d.modele_id },
          data: {
            categorie_id: d.nouvelleCatId
          }
        });
      }
      modifies++;
    }

    console.log(`🎉 SUCCÈS : ${modifies} produits et leurs modèles ont été reclassés avec succès !`);
  } else {
    console.log("ℹ️  Simulation terminée. Aucune modification n'a été écrite en base.");
    console.log("👉 Pour appliquer ces changements, relancez avec le flag : --execute\n");
  }
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant l'exécution :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
