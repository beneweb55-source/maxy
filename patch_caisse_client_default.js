const fs = require('fs');
let code = fs.readFileSync('components/caisse/CaisseClient.tsx', 'utf8');

code = code.replace(
  'setDonnees(corps as ReponseCaisse);\n      setErreur(null);',
  `setDonnees(corps as ReponseCaisse);
      setErreur(null);
      if (!donnees) { // only set the first time to avoid overwriting user edits on refresh
        const d = corps as any;
        if (d.parametres) {
          setPctReinvest(d.parametres.pct_reinvest ?? 50);
          setPctReserve(d.parametres.pct_reserve ?? 20);
          setPctParts(d.parametres.pct_parts ?? 20);
          setPctFrais(d.parametres.pct_frais ?? 10);
        }
      }`
);

fs.writeFileSync('components/caisse/CaisseClient.tsx', code);
