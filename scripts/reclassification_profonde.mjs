import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Arguments
const args = process.argv.slice(2);
const forceExecute = args.includes("--force") || args.includes("--execute");

console.log("=================================================================");
console.log("🔍 SCRIPT DE RECLASSEMENT PROFOND & DÉTECTION D'ANOMALIES");
console.log(`MODE: ${forceExecute ? "⚡ EXÉCUTION RÉELLE (--force)" : "🛡️ DRY-RUN (Simulation uniquement)"}`);
console.log("=================================================================\n");

async function main() {
  // 1. Charger toutes les catégories (requête rapide)
  const toutesCategories = await prisma.categorie.findMany({
    select: {
      id: true,
      nom: true,
      parent_id: true,
      parent: {
        select: {
          id: true,
          nom: true,
          parent_id: true,
          parent: { select: { id: true, nom: true } }
        }
      }
    }
  });

  const catMap = new Map();
  for (const c of toutesCategories) {
    catMap.set(c.id, c);
  }

  function getCheminComplet(cat) {
    if (!cat) return "Inconnu";
    const parts = [];
    if (cat.parent?.parent) parts.push(cat.parent.parent.nom);
    if (cat.parent) parts.push(cat.parent.nom);
    parts.push(cat.nom);
    return parts.join(" > ");
  }

  function trouverCatId(nomRegex, parentNomRegex) {
    const found = toutesCategories.find((c) => {
      if (!nomRegex.test(c.nom)) return false;
      if (parentNomRegex && c.parent) {
        return parentNomRegex.test(c.parent.nom);
      }
      return true;
    });
    return found ? found.id : null;
  }

  const idServeursTour = trouverCatId(/serveurs?\s+tour/i) || trouverCatId(/tour/i, /serveur/i);
  const idServeursRack = trouverCatId(/serveurs?\s+rack/i) || trouverCatId(/rack/i, /serveur/i);
  const idAlimentations = trouverCatId(/alimentation/i, /chargeur|electricite/i) || 107;
  const idVentilateurs = trouverCatId(/refroidissement|ventilateur/i) || 154;
  const idAccessoiresCaisse = trouverCatId(/accessoire/i, /caisse|point de vente/i);
  const idTerminauxTPV = trouverCatId(/terminaux|caisse/i, /point de vente/i) || 88;

  console.log("📍 Catégories Cibles Détectées :");
  console.log(`- Serveurs Tour : ID ${idServeursTour} (${catMap.get(idServeursTour)?.nom})`);
  console.log(`- Serveurs Rack : ID ${idServeursRack} (${catMap.get(idServeursRack)?.nom})`);
  console.log(`- Alimentations / PSU : ID ${idAlimentations} (${catMap.get(idAlimentations)?.nom})`);
  console.log(`- Ventilateurs / Cooling : ID ${idVentilateurs} (${catMap.get(idVentilateurs)?.nom})`);
  console.log(`- Terminaux TPV : ID ${idTerminauxTPV} (${catMap.get(idTerminauxTPV)?.nom})\n`);

  // 2. Charger les produits
  const produits = await prisma.produit.findMany({
    select: {
      id: true,
      reference: true,
      categorie: true,
      categorie_id: true,
      code_interne: true,
      modele_id: true,
      modele: {
        select: {
          id: true,
          nom: true,
          categorie_id: true
        }
      }
    }
  });

  console.log(`📦 Total produits analysés : ${produits.length}\n`);

  const reclassifications = [];
  const contradictions = [];
  const orphelins = [];

  for (const p of produits) {
    const ref = (p.reference || "").trim();
    const modeleNom = (p.modele?.nom || "").trim();
    const catNom = (p.categorie || "").trim();
    const catRel = catMap.get(p.categorie_id || p.modele?.categorie_id);
    const cheminActuel = getCheminComplet(catRel);
    const texteAnalyse = `${ref} ${modeleNom} ${catNom}`.toLowerCase();

    // A. DÉTECTION DES ORPHELINS
    if (!p.categorie_id && !p.modele?.categorie_id) {
      orphelins.push({
        id: p.id,
        code_interne: p.code_interne,
        reference: ref,
        raison: "Aucun categorie_id défini"
      });
    } else if (p.categorie_id && !catMap.has(p.categorie_id)) {
      orphelins.push({
        id: p.id,
        code_interne: p.code_interne,
        reference: ref,
        raison: `categorie_id ${p.categorie_id} inexistant`
      });
    }

    // B. RECLASSEMENT SERVEURS TOUR (HP ProLiant ML, Dell PowerEdge T, Tower, ThinkSystem ST, etc.)
    const estComposantAccessoire = /(heatsink|radiateur|ventilateur|\bfan\b|caddy|tiroir|rail kit|\brail\b|cable|nappe|carte raid|controleur raid)/i.test(ref);

    const estServeurTourRegex = /(proliant\s+ml|poweredge\s+t|thinksystem\s+st|primergy\s+tx|\bml350\b|\bml110\b|\bml30\b|\bml150\b|\bml310\b|\bt140\b|\bt340\b|\bt440\b|\bt640\b|\bt330\b|\bt430\b|\bt630\b|\bt110\b|\bt30\b|\bt40\b|server\s+tower|serveur\s+tour)/i;
    
    if (!estComposantAccessoire && (estServeurTourRegex.test(ref) || estServeurTourRegex.test(modeleNom))) {
      if (idServeursTour && p.categorie_id !== idServeursTour) {
        reclassifications.push({
          produitId: p.id,
          modeleId: p.modele_id,
          code_interne: p.code_interne,
          reference: ref,
          ancienChemin: cheminActuel || catNom,
          nouvelId: idServeursTour,
          nouveauChemin: getCheminComplet(catMap.get(idServeursTour)),
          motif: "Détection Serveur Tour (ML / PowerEdge T / ST / Tower)"
        });
        continue;
      }
    }

    // C. RECLASSEMENT SERVEURS RACK (HP DL, Dell PowerEdge R, ThinkSystem SR, etc.)
    const estServeurRackRegex = /(proliant\s+dl|poweredge\s+r|thinksystem\s+sr|primergy\s+rx|\bdl380\b|\bdl360\b|\bdl160\b|\bdl20\b|\bdl560\b|\bdl580\b|\br640\b|\br740\b|\br440\b|\br540\b|\br630\b|\br730\b|\br430\b|\br530\b|\br230\b|\br330\b|\bsr650\b|\bsr630\b|server\s+rack|serveur\s+rack)/i;
    if (!estComposantAccessoire && (estServeurRackRegex.test(ref) || estServeurRackRegex.test(modeleNom))) {
      if (idServeursRack && p.categorie_id !== idServeursRack && (!p.categorie_id || !catMap.get(p.categorie_id)?.nom.toLowerCase().includes("rack"))) {
        reclassifications.push({
          produitId: p.id,
          modeleId: p.modele_id,
          code_interne: p.code_interne,
          reference: ref,
          ancienChemin: cheminActuel || catNom,
          nouvelId: idServeursRack,
          nouveauChemin: getCheminComplet(catMap.get(idServeursRack)),
          motif: "Détection Serveur Rack (DL / PowerEdge R / SR / Rack)"
        });
        continue;
      }
    }

    // D. DÉTECTION DE CONTRADICTIONS DANS "TERMINAUX & CAISSES" / "POINT DE VENTE"
    const estClassePointDeVente = cheminActuel.toLowerCase().includes("point de vente") || cheminActuel.toLowerCase().includes("caisse");
    if (estClassePointDeVente) {
      const estAlim = /(alimentation|bloc d'alim|power supply|\bpsu\b|750w|800w|1200w|1400w|500w)/i.test(ref);
      const estFan = /(ventilateur|fan module|sunon|ebm-papst|delta fan)/i.test(ref);
      const estSupport = /(support ecran|bras ecran|support mural|vesa)/i.test(ref);

      if (estAlim && idAlimentations) {
        contradictions.push({
          produitId: p.id,
          reference: ref,
          actuel: cheminActuel,
          correctionProposee: getCheminComplet(catMap.get(idAlimentations)),
          correctionId: idAlimentations,
          motif: "Composant Alimentation classé à tort dans Point de Vente"
        });
      } else if (estFan && idVentilateurs) {
        contradictions.push({
          produitId: p.id,
          reference: ref,
          actuel: cheminActuel,
          correctionProposee: getCheminComplet(catMap.get(idVentilateurs)),
          correctionId: idVentilateurs,
          motif: "Ventilateur/Cooling classé à tort dans Point de Vente"
        });
      } else if (estSupport && idAccessoiresCaisse) {
        contradictions.push({
          produitId: p.id,
          reference: ref,
          actuel: cheminActuel,
          correctionProposee: getCheminComplet(catMap.get(idAccessoiresCaisse)),
          correctionId: idAccessoiresCaisse,
          motif: "Support/Bras classé dans Terminaux plutôt qu'Accessoires"
        });
      }
    }
  }

  // 3. AFFICHAGE DES RÉSULTATS
  console.log("=================================================================");
  console.log(`🚨 PRODUITS ORPHELINS DÉTECTÉS : ${orphelins.length}`);
  console.log("=================================================================");
  if (orphelins.length > 0) {
    orphelins.forEach((o) => {
      console.log(`❌ [${o.code_interne || o.id}] "${o.reference}" => ${o.raison}`);
    });
  } else {
    console.log("✅ Aucun produit orphelin détecté !");
  }
  console.log();

  console.log("=================================================================");
  console.log(`⚠️ CONTRADICTIONS DÉTECTÉES DANS POINT DE VENTE : ${contradictions.length}`);
  console.log("=================================================================");
  if (contradictions.length > 0) {
    contradictions.forEach((c) => {
      console.log(`⚠️ Produit #${c.produitId} "${c.reference}"`);
      console.log(`   Actuel : ${c.actuel}`);
      console.log(`   Proposé : ${c.correctionProposee} (ID ${c.correctionId})`);
      console.log(`   Motif  : ${c.motif}\n`);
    });
  } else {
    console.log("✅ Aucune contradiction détectée dans Point de Vente !");
  }
  console.log();

  console.log("=================================================================");
  console.log(`🔄 RECLASSIFICATIONS RECOMMANDÉES : ${reclassifications.length}`);
  console.log("=================================================================");
  if (reclassifications.length > 0) {
    reclassifications.forEach((r) => {
      console.log(`✨ [${r.code_interne || r.produitId}] "${r.reference}"`);
      console.log(`   ${r.ancienChemin} ➔ ➔ ➔ ${r.nouveauChemin} (ID ${r.nouvelId})`);
      console.log(`   Motif: ${r.motif}\n`);
    });
  } else {
    console.log("✅ Tous les serveurs et composants sont déjà parfaitement positionnés !");
  }
  console.log();

  // 4. EXÉCUTION SI LE FLAG EST FOURNI
  const totalModifications = reclassifications.length + contradictions.length;
  if (totalModifications === 0) {
    console.log("🎉 Aucun changement nécessaire, la base est 100% propre !");
    return;
  }

  if (!forceExecute) {
    console.log("-----------------------------------------------------------------");
    console.log(`🛡️ SIMULATION TERMINÉE : ${totalModifications} produit(s) prêt(s) à être mis à jour.`);
    console.log("Pour appliquer ces modifications en base de données, relancez avec :");
    console.log("node scripts/reclassification_profonde.mjs --force");
    console.log("-----------------------------------------------------------------");
    return;
  }

  // Application réelle des mises à jour
  console.log("⚡ APPLICATION DES MODIFICATIONS EN BASE...");
  let nbSucces = 0;

  for (const r of reclassifications) {
    const nouveauNomCat = catMap.get(r.nouvelId)?.nom || "";
    await prisma.produit.update({
      where: { id: r.produitId },
      data: {
        categorie_id: r.nouvelId,
        categorie: nouveauNomCat
      }
    });
    if (r.modeleId) {
      await prisma.modele.update({
        where: { id: r.modeleId },
        data: { categorie_id: r.nouvelId }
      });
    }
    nbSucces++;
  }

  for (const c of contradictions) {
    const nouveauNomCat = catMap.get(c.correctionId)?.nom || "";
    await prisma.produit.update({
      where: { id: c.produitId },
      data: {
        categorie_id: c.correctionId,
        categorie: nouveauNomCat
      }
    });
    nbSucces++;
  }

  console.log(`✅ ${nbSucces} produit(s) mis à jour avec succès en base de données !`);
}

main()
  .catch((err) => {
    console.error("❌ Erreur critique lors de l'exécution :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
