const fs = require('fs');
let code = fs.readFileSync('app/api/caisse/repartition/route.ts', 'utf8');

code = code.replace(
  'description: \`Répartition \${cleMois} — réinvestissement 50 % (\${marqueur})\`,',
  'description: \`Répartition \${cleMois} — réinvestissement \${customPct.reinvest} % (\${marqueur})\`,'
);

code = code.replace(
  'description: \`Répartition \${cleMois} — réserve 20 %\`,',
  'description: \`Répartition \${cleMois} — réserve \${customPct.reserve} %\`,'
);

code = code.replace(
  'description: \`Répartition \${cleMois} — parts des 4 associés (5 % chacun)\`,',
  'description: \`Répartition \${cleMois} — parts des 4 associés (\${customPct.parts} % total)\`,'
);

code = code.replace(
  'description: \`Répartition \${cleMois} — frais divers 10 %\`,',
  'description: \`Répartition \${cleMois} — frais divers \${customPct.frais} %\`,'
);

code = code.replace(
  'message: \`Le fonds de réserve (\${formaterDA(soldes.reserve)}) n\\'a pas atteint son objectif : les 20 % de parts (\${formaterDA(partAssocies)}) seront transférés en réserve au lieu d\\'être versés. Confirmer la répartition ?\`,',
  'message: \`Le fonds de réserve (\${formaterDA(soldes.reserve)}) n\\'a pas atteint son objectif : les \${customPct.parts} % de parts (\${formaterDA(partAssocies)}) seront transférés en réserve au lieu d\\'être versés. Confirmer la répartition ?\`,'
);

code = code.replace(
  'réinvest 50 % (neutre) · réserve 20 % · parts 20 % · frais 10 %',
  'réinvest X % (neutre) · réserve Y % · parts Z % · frais W %'
);

fs.writeFileSync('app/api/caisse/repartition/route.ts', code);
