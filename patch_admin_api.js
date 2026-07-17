const fs = require('fs');
let code = fs.readFileSync('app/api/admin/route.ts', 'utf8');

code = code.replace(
  'objectif_reserve: parametres?.objectif_reserve ?? 50000,',
  `objectif_reserve: parametres?.objectif_reserve ?? 50000,
        pct_reinvest: parametres?.pct_reinvest ?? 50,
        pct_reserve: parametres?.pct_reserve ?? 20,
        pct_parts: parametres?.pct_parts ?? 20,
        pct_frais: parametres?.pct_frais ?? 10,`
);

fs.writeFileSync('app/api/admin/route.ts', code);
