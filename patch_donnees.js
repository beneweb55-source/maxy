const fs = require('fs');
let code = fs.readFileSync('lib/dashboard/donnees.ts', 'utf8');

code = code.replace(
  'import type {',
  'import type {\n  DonneesGraphique,\n  PointGraphique,'
);

code = code.replace(
  'const graphiques: Partial<Record<SourceGraphique, PointMois[]>> = {};',
  'const graphiques: Partial<Record<SourceGraphique, DonneesGraphique>> = {};'
);

const graphiquesGen = `  const genererDonneesGraphique = (valeurDe: (v: (typeof ventes)[number]) => number): DonneesGraphique => {
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

    const serieMois: PointGraphique[] = Array.from({ length: 6 }, (_, i) => {
      const cle = cleMois(debutMoisUTC(maintenant, i - 5));
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

code = code.replace(
  `  const serie6Mois = (parMois: Map<string, number>): PointMois[] =>
    Array.from({ length: 6 }, (_, i) => {
      const cle = cleMois(debutMoisUTC(maintenant, i - 5));
      return { mois: cle, valeur: parMois.get(cle) ?? 0 };
    });

  if (sourcesGraphiques.has("benefices_6_mois") && margesParMois) {
    graphiques.benefices_6_mois = serie6Mois(margesParMois);
  }
  if (sourcesGraphiques.has("ca_6_mois") && caParMois) {
    graphiques.ca_6_mois = serie6Mois(caParMois);
  }`,
  graphiquesGen
);

fs.writeFileSync('lib/dashboard/donnees.ts', code);
