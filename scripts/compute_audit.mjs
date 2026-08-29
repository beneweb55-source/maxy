import fs from "fs";

async function main() {
  const auditData = JSON.parse(fs.readFileSync("scratch/audit_post_migration.json", "utf8"));
  
  // Also load categories_test.json if available
  let categoriesTest = [];
  try {
    categoriesTest = JSON.parse(fs.readFileSync("scratch/categories_test.json", "utf8"));
  } catch (e) {
    console.warn("No categories_test.json found.");
  }

  const { produits, modeles, propositions, factures } = auditData;
  const total = produits.length;

  // 1. Catégorisation des produits
  let nbConserves = 0; // Ceux qui n'ont pas été touchés (modele_id === null)
  let nbGeneralises = 0; // Ceux qui ont modele_id !== null et qui ont perdu la réf (reference === modele.nom)

  const recuperablesA = []; // Via Modele.attributs["Details"]
  const recuperablesB = []; // Via PropositionMigration unique
  const ambigusC = []; // Fusion de plusieurs anciens groupes
  const perdusD = []; // Irrécupérable

  const modelesMap = new Map();
  for (const m of modeles) {
    modelesMap.set(m.id, m);
  }

  const propsParModele = new Map();
  for (const p of propositions) {
    if (p.cible_modele_nom && p.cible_categorie_id) {
      const key = `${p.cible_categorie_id}_${p.cible_modele_nom}`;
      if (!propsParModele.has(key)) propsParModele.set(key, []);
      propsParModele.get(key).push(p);
    }
  }

  for (const p of produits) {
    if (p.modele_id === null) {
      nbConserves++;
      continue;
    }

    const modele = modelesMap.get(p.modele_id);
    if (!modele) {
      perdusD.push(p);
      continue;
    }

    if (p.reference !== modele.nom) {
      // Ils ont déjà une référence exacte (étrange, le script fix les a tous écrasés normalement)
      recuperablesA.push({ produit: p, originalRef: p.reference, cause: "Déjà exact" });
      continue;
    }

    nbGeneralises++;

    // Chercher la trace
    const attrs = modele.attributs || {};
    const detailAttr = attrs["Details"];

    const propsKey = `${modele.categorie_id}_${modele.nom}`;
    const props = propsParModele.get(propsKey) || [];

    if (props.length === 1) {
      // B. Reconstructible via PropositionMigration (1 seul ancien groupe = 100% sûr)
      recuperablesB.push({ produit: p, originalRef: props[0].groupe_reference, modele });
    } else if (props.length > 1) {
      // C. Ambigu : plusieurs anciens groupes fusionnés dans ce modèle
      // On peut vérifier FactureLigne
      const f = factures.find(fact => fact.produit_id === p.id);
      if (f) {
        recuperablesA.push({ produit: p, originalRef: f.designation, cause: "FactureLigne" });
      } else {
        ambigusC.push({ produit: p, modele, possibles: props.map(x => x.groupe_reference) });
      }
    } else if (detailAttr) {
      // A. Trace dans attributs
      recuperablesA.push({ produit: p, originalRef: detailAttr, cause: "Attribut Modele" });
    } else {
      // Peut-être dans FactureLigne ?
      const f = factures.find(fact => fact.produit_id === p.id);
      if (f) {
        recuperablesA.push({ produit: p, originalRef: f.designation, cause: "FactureLigne" });
      } else {
        // Peut-être dans Notes ?
        if (p.notes && p.notes.length > 5) {
           recuperablesA.push({ produit: p, originalRef: p.notes, cause: "Notes" });
        } else {
           perdusD.push({ produit: p, modele });
        }
      }
    }
  }

  const report = `# RAPPORT POST-MIGRATION CORRECTIVE

## RÉSUMÉ FORENSIQUE
- Total produits analysés : **${total}**
- Produits correctement conservés (non touchés) : **${nbConserves}**
- Produits généralisés par l'écrasement : **${nbGeneralises}**

## ÉVALUATION DE RÉCUPÉRATION
- **Niveau A (Récupération EXACTE)** : ${recuperablesA.length} produits
- **Niveau B (Reconstruction SÛRE)** : ${recuperablesB.length} produits
- **Niveau C (AMBIGU - fusionnés)** : ${ambigusC.length} produits
- **Niveau D (PERDUS)** : ${perdusD.length} produits

## ANALYSE DES AMBIGUÏTÉS (Niveau C)
Les ${ambigusC.length} produits ambigus proviennent de ${new Set(ambigusC.map(a => a.modele.nom)).size} modèles qui ont fusionné plusieurs anciennes références différentes. Comme ils sont désormais identiques en base, on ne peut pas les différencier automatiquement.

Exemple de fusion détectée :
${ambigusC.slice(0, 3).map(a => `- Modèle actuel: "${a.modele.nom}" => Était soit: ${a.possibles.join(" OU ")}`).join('\n')}

---
### ACTION REQUISE POUR LE NIVEAU C
Nous pouvons restaurer tous les niveaux A et B automatiquement (ils représentent ${recuperablesA.length + recuperablesB.length} produits).
Pour les ${ambigusC.length} produits ambigus, nous avons deux choix :
1. Leur appliquer la mention "À vérifier" dans la référence.
2. Essayer de croiser avec \`categories_test.json\` et \`prix_achat\` pour deviner lequel est lequel.
`;

  fs.writeFileSync("implementation_plan.md", report);
  console.log("Rapport généré dans implementation_plan.md !");
}

main();
