import { analyserGroupe } from '../lib/migration/moteur';
import fs from 'fs';

const categories = JSON.parse(fs.readFileSync('./scratch/categories_test.json', 'utf-8'));

let matchCount = 0;
let missedCount = 0;
const report = [];

for (const c of categories) {
  const result = analyserGroupe(c.categorie, c.reference, c.nb_produits);
  if (result.cible_famille_nom) {
    matchCount++;
  } else {
    missedCount++;
  }
  
  if (c.nb_produits >= 10 || result.confiance < 50 || c.reference.includes("battery") || c.categorie === "Samsung") {
     report.push({
       legacy: `[${c.categorie}] ${c.reference} (${c.nb_produits}x)`,
       new: `${result.cible_famille_nom} > ${result.cible_categorie_nom} > ${result.cible_modele_nom}`,
       confiance: result.confiance,
       raisons: result.raisons.join(" | "),
       attributs: result.cible_attributs
     });
  }
}

console.log(`Matched: ${matchCount}, Missed: ${missedCount}`);
console.log("Exemples intéressants:");
console.table(report.slice(0, 15));
