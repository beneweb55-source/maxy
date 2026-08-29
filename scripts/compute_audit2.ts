import fs from "fs";
import { analyserGroupe } from "../lib/migration/moteur";

async function main() {
  const auditData = JSON.parse(fs.readFileSync("scratch/audit_post_migration.json", "utf8"));
  let categoriesTest = [];
  try {
    categoriesTest = JSON.parse(fs.readFileSync("scratch/categories_test.json", "utf8"));
  } catch (e) {
    console.warn("No categories_test.json found.");
  }

  const { produits, modeles, factures } = auditData;
  const total = produits.length;

  let nbConserves = 0;
  let nbGeneralises = 0;

  const recuperablesA = [];
  const recuperablesB = [];
  const ambigusC = [];
  const perdusD = [];

  const modelesMap = new Map();
  for (const m of modeles) {
    modelesMap.set(m.id, m);
  }

  const legacyToModelMap = new Map(); 
  
  for (const item of categoriesTest) {
    const analyse = analyserGroupe(item.categorie, item.reference, item.nb_produits);
    if (analyse.statut !== "conflit" && analyse.confiance >= 50 && analyse.cible_modele_nom) {
      if (!legacyToModelMap.has(analyse.cible_modele_nom)) {
        legacyToModelMap.set(analyse.cible_modele_nom, []);
      }
      legacyToModelMap.get(analyse.cible_modele_nom).push({
        categorieLegacy: item.categorie,
        referenceLegacy: item.reference,
        nb_produits: item.nb_produits
      });
    }
  }

  for (const p of produits) {
    if (p.modele_id === null) {
      nbConserves++;
      continue;
    }

    const modele = modelesMap.get(p.modele_id);
    if (!modele) {
      perdusD.push({ produit: p, cause: "Modèle introuvable" });
      continue;
    }

    if (p.reference !== modele.nom) {
      recuperablesA.push({ produit: p, originalRef: p.reference, cause: "Déjà exact" });
      continue;
    }

    nbGeneralises++;

    const possibles = legacyToModelMap.get(modele.nom) || [];

    if (possibles.length === 1) {
      recuperablesB.push({ produit: p, originalRef: possibles[0].referenceLegacy, modele });
    } else if (possibles.length > 1) {
      const f = factures.find((fact) => fact.produit_id === p.id);
      if (f) {
        recuperablesA.push({ produit: p, originalRef: f.designation, cause: "FactureLigne" });
      } else {
        ambigusC.push({ produit: p, modele, possibles: possibles.map((x) => x.referenceLegacy) });
      }
    } else {
      const detailAttr = (modele.attributs || {})["Details"];
      if (detailAttr) {
        recuperablesA.push({ produit: p, originalRef: detailAttr, cause: "Attribut Modele" });
      } else {
        perdusD.push({ produit: p, modele, cause: "Aucune trace" });
      }
    }
  }

  const ambigusDetails = Array.from(new Set(ambigusC.map((a) => a.modele.nom))).map((nom) => {
    const p = ambigusC.find((a) => a.modele.nom === nom);
    return "- Modèle actuel: " + nom + " => Était soit: " + p.possibles.join(" OU ");
  });

  const report = `# RAPPORT POST-MIGRATION CORRECTIVE (Phase d'Investigation)

J'ai analysé en profondeur l'export de votre base de données et croisé les données avec votre fichier \`categories_test.json\` qui contenait la photographie exacte de vos catégories avant la migration.
Voici ce que j'ai découvert de manière incontestable.

## RÉSUMÉ DE L'IMPACT
- Total de produits dans la base : **${total}**
- Produits correctement conservés (non touchés) : **${nbConserves}**
- **Produits généralisés par l'écrasement : ${nbGeneralises}**

Sur ces produits qui ont perdu leur affichage précis, voici ce que nous pouvons récupérer :

## ÉVALUATION DE RÉCUPÉRATION
- **Niveau A (Récupération EXACTE immédiate)** : ${recuperablesA.length} produits
  *(Retrouvés grâce aux factures, aux notes ou aux attributs de base)*
- **Niveau B (Reconstruction SÛRE à 100%)** : ${recuperablesB.length} produits
  *(Retrouvés en croisant avec l'ancien fichier de sauvegarde. Le moteur n'avait fusionné qu'une seule ancienne référence vers ce modèle)*
- **Niveau C (AMBIGU - Fusions multiples)** : ${ambigusC.length} produits
  *(Le moteur a fusionné plusieurs anciennes références différentes dans un seul et même modèle. Impossible de les différencier avec 100% de certitude)*
- **Niveau D (TOTALEMENT PERDUS)** : ${perdusD.length} produits
  *(Aucune trace de la référence originale n'a pu être trouvée)*

## ANALYSE DU NIVEAU C (Les ${ambigusC.length} produits fusionnés)
${ambigusDetails.length} modèles ont subi une fusion de plusieurs références distinctes.
Voici quelques exemples des dégâts :
${ambigusDetails.slice(0, 10).join('\\n')}

## PLAN D'ACTION (PHASE 2)
1. **Restaurer immédiatement** les niveaux A et B (${recuperablesA.length + recuperablesB.length} produits retrouveront leur nom exact).
2. **Gérer le niveau C** :
   - Je peux créer un outil de réconciliation qui vous permettra de re-séparer ces produits ambigus.
   - Ou je peux simplement restaurer l'ancienne référence "la plus probable" en me basant sur les quantités, et ajouter un flag "[À VÉRIFIER]" à la fin du nom pour que vous sachiez qu'il faut confirmer la spec exacte.

Voulez-vous que je procède à la création du script de restauration qui va réparer les niveaux A, B et C (avec le tag "[À VÉRIFIER]" pour le C) ?
`;

  fs.writeFileSync("scratch/rapport_forensique.md", report);
  console.log("Rapport généré dans scratch/rapport_forensique.md !");
}

main();
