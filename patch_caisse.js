const fs = require('fs');
let code = fs.readFileSync('app/api/caisse/route.ts', 'utf8');

const regex = /\/\/ Graphique : solde total[\s\S]*?graphique_soldes: finsDeMois,/m;

const newBlock = `    const JOUR_MS = 24 * 60 * 60 * 1000;
    
    const serieJours: { label: string; solde: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(maintenant.getTime() - i * JOUR_MS);
      const finJour = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
      const cle = \`\${d.getUTCFullYear()}-\${String(d.getUTCMonth() + 1).padStart(2, "0")}-\${String(d.getUTCDate()).padStart(2, "0")}\`;
      const avant = tous.filter((m) => m.date < finJour);
      serieJours.push({ label: cle, solde: calculerSoldes(avant).total });
    }

    const serieMois: { label: string; solde: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const debutSuivant = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i + 1, 1));
      const cle = cleMoisUTC(new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1)));
      const avant = tous.filter((m) => m.date < debutSuivant);
      serieMois.push({ label: cle, solde: calculerSoldes(avant).total });
    }

    const serieAns: { label: string; solde: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const annee = maintenant.getUTCFullYear() - i;
      const debutSuivant = new Date(Date.UTC(annee + 1, 0, 1));
      const cle = \`\${annee}\`;
      const avant = tous.filter((m) => m.date < debutSuivant);
      serieAns.push({ label: cle, solde: calculerSoldes(avant).total });
    }

    const graphique_soldes = { jour: serieJours, mois: serieMois, an: serieAns };

    const benefice = await beneficeDuMois(
      prisma,
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth() + 1
    );

    return NextResponse.json({
      soldes,
      parametres: {
        marge_minimum_pct: parametres?.marge_minimum_pct ?? 20,
        objectif_reserve: parametres?.objectif_reserve ?? 50000,
        pct_reinvest: parametres?.pct_reinvest ?? 50,
        pct_reserve: parametres?.pct_reserve ?? 20,
        pct_parts: parametres?.pct_parts ?? 20,
        pct_frais: parametres?.pct_frais ?? 10,
      },
      graphique_soldes,`;

code = code.replace(regex, newBlock);

fs.writeFileSync('app/api/caisse/route.ts', code);
