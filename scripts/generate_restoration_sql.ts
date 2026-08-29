
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { analyserGroupe } from "../lib/migration/moteur";

async function main() {
  const prisma = new PrismaClient();
  
  // We use the exported data to do the mapping, but the updates will be printed as SQL
  const auditData = JSON.parse(fs.readFileSync("scratch/audit_post_migration.json", "utf8"));
  let categoriesTest = [];
  try {
    categoriesTest = JSON.parse(fs.readFileSync("scratch/categories_test.json", "utf8"));
  } catch (e) {
    console.error("Missing categories_test.json");
    process.exit(1);
  }

  const { produits, modeles, factures } = auditData;

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

  let sqlOutput = "-- SCRIPT DE RESTAURATION (Généré Automatiquement)\n";
  sqlOutput += "BEGIN;\n\n";

  let mdReport = "# RAPPORT DES PRODUITS AMBIGUS (NIVEAU C)\n\n";
  mdReport += "Ces produits ont été fusionnés dans un modèle générique, et aucune preuve individuelle n'a été trouvée.\n\n";

  let restoredA = 0;
  let restoredB = 0;
  let ambigusC = 0;

  for (const p of produits) {
    if (p.modele_id === null) continue;

    const modele = modelesMap.get(p.modele_id);
    if (!modele) continue;

    if (p.reference !== modele.nom) continue; // Déjà exact

    const possibles = legacyToModelMap.get(modele.nom) || [];

    // NIVEAU B : 100% SÛR CAR GROUPE UNIQUE
    if (possibles.length === 1) {
      const ref = possibles[0].referenceLegacy.replace(/'/g, "''");
      sqlOutput += `UPDATE produits SET reference = '${ref}' WHERE id = ${p.id}; -- [Niveau B] Corrélation de groupe\n`;
      restoredB++;
      continue;
    }

    // NIVEAU A / C : PREUVE INDIVIDUELLE OU AMBIGU
    if (possibles.length > 1) {
      // 1. Chercher dans Factures
      const f = factures.find((fact) => fact.produit_id === p.id);
      if (f) {
        const ref = f.designation.replace(/'/g, "''");
        sqlOutput += `UPDATE produits SET reference = '${ref}' WHERE id = ${p.id}; -- [Niveau A] Preuve: Facture\n`;
        restoredA++;
        continue;
      }
      
      // 2. Chercher dans les notes
      let foundInNotes = false;
      if (p.notes) {
        for (const poss of possibles) {
          if (p.notes.includes(poss.referenceLegacy)) {
            const ref = poss.referenceLegacy.replace(/'/g, "''");
            sqlOutput += `UPDATE produits SET reference = '${ref}' WHERE id = ${p.id}; -- [Niveau A] Preuve: Notes\n`;
            restoredA++;
            foundInNotes = true;
            break;
          }
        }
      }
      if (foundInNotes) continue;

      // AUCUNE PREUVE INDIVIDUELLE -> AMBIGU
      ambigusC++;
      mdReport += `### ${p.code_interne} (Modèle: ${modele.nom})\n`;
      mdReport += `- ID Base de données : ${p.id}\n`;
      mdReport += `- Historiquement, il s'agit de l'une de ces références :\n`;
      for (const poss of possibles) {
         mdReport += `  - ${poss.referenceLegacy}\n`;
      }
      mdReport += "\n";
      
      // On met un flag dans la base pour faciliter la recherche dans l'UI
      const flagRef = `${modele.nom} [À IDENTIFIER]`.replace(/'/g, "''");
      sqlOutput += `UPDATE produits SET reference = '${flagRef}' WHERE id = ${p.id}; -- [Niveau C] Ambigu\n`;
      
    } else {
      // PERDU (Aucune trace dans le mapping)
      const flagRef = `${modele.nom} [RÉFÉRENCE PERDUE]`.replace(/'/g, "''");
      sqlOutput += `UPDATE produits SET reference = '${flagRef}' WHERE id = ${p.id}; -- [Niveau D] Perdu\n`;
    }
  }

  sqlOutput += "\nCOMMIT;\n";

  fs.writeFileSync("scratch/restauration.sql", sqlOutput);
  fs.writeFileSync("scratch/produits_ambigus.md", mdReport);

  console.log(`✅ Terminé ! ${restoredA} (Preuve Individuelle) + ${restoredB} (Groupe Unique) restaurés.`);
  console.log(`⚠️ ${ambigusC} produits restent ambigus.`);
}

main();
