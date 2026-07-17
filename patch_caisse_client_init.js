const fs = require('fs');
let code = fs.readFileSync('components/caisse/CaisseClient.tsx', 'utf8');

code = code.replace(
  'if (!donnees) { // only set the first time to avoid overwriting user edits on refresh\n        const d = corps as any;\n        if (d.parametres) {\n          setPctReinvest(d.parametres.pct_reinvest ?? 50);\n          setPctReserve(d.parametres.pct_reserve ?? 20);\n          setPctParts(d.parametres.pct_parts ?? 20);\n          setPctFrais(d.parametres.pct_frais ?? 10);\n        }\n      }',
  `// On state update we use functional update to safely access previous state
      setDonnees((prev) => {
        if (!prev) {
          const d = corps as any;
          if (d.parametres) {
            setPctReinvest(d.parametres.pct_reinvest ?? 50);
            setPctReserve(d.parametres.pct_reserve ?? 20);
            setPctParts(d.parametres.pct_parts ?? 20);
            setPctFrais(d.parametres.pct_frais ?? 10);
          }
        }
        return corps as ReponseCaisse;
      });`
);

code = code.replace(
  'setDonnees(corps as ReponseCaisse);',
  ''
);

fs.writeFileSync('components/caisse/CaisseClient.tsx', code);
