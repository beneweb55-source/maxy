const fs = require('fs');
let code = fs.readFileSync('lib/dashboard/donnees.ts', 'utf8');

const oldBlock = `  const serie6Mois = (parMois: Map<string, number>): PointMois[] =>
    Array.from({ length: 6 }, (_, i) => {
      const cle = cleMois(debutMoisUTC(maintenant, i - 5));
      return { mois: cle, valeur: parMois.get(cle) ?? 0 };
    });

  if (sourcesGraphiques.has("benefices_6_mois") && margesParMois) {
    graphiques.benefices_6_mois = serie6Mois(margesParMois);
  }
  if (sourcesGraphiques.has("ca_6_mois") && caParMois) {
    graphiques.ca_6_mois = serie6Mois(caParMois);
  }`;

const newBlock = `  const genererDonneesGraphique = (valeurDe: (v: (typeof ventesPromise extends Promise<infer U> ? U : never)[number]) => number): DonneesGraphique => {
    const jours = new Map<string, number>();
    const moisMap = new Map<string, number>();
    const ans = new Map<string, number>();

    for (const v of ventesValides) {
      const d = v.date_vente;
      const cleJour = \`\${d.getUTCFullYear()}-\${String(d.getUTCMonth() + 1).padStart(2, "0")}-\${String(d.getUTCDate()).padStart(2, "0")}\`;
      const cleMoisStr = cleMois(d);
      const cleAn = \`\${d.getUTCFullYear()}\`;

      jours.set(cleJour, (jours.get(cleJour) ?? 0) + valeurDe(v));
      moisMap.set(cleMoisStr, (moisMap.get(cleMoisStr) ?? 0) + valeurDe(v));
      ans.set(cleAn, (ans.get(cleAn) ?? 0) + valeurDe(v));
    }

    const serieJours: PointGraphique[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(maintenant.getTime() - (29 - i) * JOUR_MS);
      const cle = \`\${d.getUTCFullYear()}-\${String(d.getUTCMonth() + 1).padStart(2, "0")}-\${String(d.getUTCDate()).padStart(2, "0")}\`;
      return { label: cle, valeur: jours.get(cle) ?? 0 };
    });

    const serieMois: PointGraphique[] = Array.from({ length: 12 }, (_, i) => {
      const cle = cleMois(debutMoisUTC(maintenant, i - 11));
      return { label: cle, valeur: moisMap.get(cle) ?? 0 };
    });

    const serieAns: PointGraphique[] = Array.from({ length: 3 }, (_, i) => {
      const annee = maintenant.getUTCFullYear() - 2 + i;
      const cle = \`\${annee}\`;
      return { label: cle, valeur: ans.get(cle) ?? 0 };
    });

    return { jour: serieJours, mois: serieMois, an: serieAns };
  };

  if (sourcesGraphiques.has("benefices_6_mois")) {
    graphiques.benefices_6_mois = genererDonneesGraphique(margeDe);
  }
  if (sourcesGraphiques.has("ca_6_mois")) {
    graphiques.ca_6_mois = genererDonneesGraphique((v) => v.prix_vente_reel);
  }`;

if (code.includes('serie6Mois')) {
  // It has it. Let's find exactly the block to replace.
  const regex = /const serie6Mois[\s\S]*?graphiques\.ca_6_mois = serie6Mois\(caParMois\);\s*}/m;
  code = code.replace(regex, newBlock);
}

fs.writeFileSync('lib/dashboard/donnees.ts', code);
