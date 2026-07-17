const fs = require('fs');
let code = fs.readFileSync('lib/dashboard/donnees.ts', 'utf8');

code = code.replace(
  'valeurDe: (v: (typeof ventesPromise extends Promise<infer U> ? U : never)[number]) => number',
  'valeurDe: (v: (typeof ventes)[number]) => number'
);

fs.writeFileSync('lib/dashboard/donnees.ts', code);
