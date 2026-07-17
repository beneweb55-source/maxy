const fs = require('fs');
let code = fs.readFileSync('app/api/parametres/route.ts', 'utf8');

code = code.replace(
  'objectif_reserve: parametres?.objectif_reserve ?? 50000,',
  `objectif_reserve: parametres?.objectif_reserve ?? 50000,
      pct_reinvest: parametres?.pct_reinvest ?? 50,
      pct_reserve: parametres?.pct_reserve ?? 20,
      pct_parts: parametres?.pct_parts ?? 20,
      pct_frais: parametres?.pct_frais ?? 10,`
);

code = code.replace(
  'const { marge_minimum_pct, objectif_reserve } = (corps ?? {}) as {',
  `const { marge_minimum_pct, objectif_reserve, pct_reinvest, pct_reserve, pct_parts, pct_frais } = (corps ?? {}) as {
    pct_reinvest?: unknown;
    pct_reserve?: unknown;
    pct_parts?: unknown;
    pct_frais?: unknown;`
);

code = code.replace(
  'if (\n    typeof objectif_reserve !== "number"',
  `if (
    typeof pct_reinvest === "number" &&
    typeof pct_reserve === "number" &&
    typeof pct_parts === "number" &&
    typeof pct_frais === "number" &&
    pct_reinvest + pct_reserve + pct_parts + pct_frais !== 100
  ) {
    return erreur(400, "La somme des pourcentages de répartition doit être égale à 100%.");
  }

  if (
    typeof objectif_reserve !== "number"`
);

code = code.replace(
  'create: { id: 1, marge_minimum_pct, objectif_reserve },',
  `create: { id: 1, marge_minimum_pct, objectif_reserve, pct_reinvest: pct_reinvest as number, pct_reserve: pct_reserve as number, pct_parts: pct_parts as number, pct_frais: pct_frais as number },`
);

code = code.replace(
  'update: { marge_minimum_pct, objectif_reserve },',
  `update: { marge_minimum_pct, objectif_reserve, pct_reinvest: pct_reinvest as number, pct_reserve: pct_reserve as number, pct_parts: pct_parts as number, pct_frais: pct_frais as number },`
);

code = code.replace(
  'objectif_reserve: parametres.objectif_reserve,',
  `objectif_reserve: parametres.objectif_reserve,
      pct_reinvest: parametres.pct_reinvest,
      pct_reserve: parametres.pct_reserve,
      pct_parts: parametres.pct_parts,
      pct_frais: parametres.pct_frais,`
);

fs.writeFileSync('app/api/parametres/route.ts', code);
