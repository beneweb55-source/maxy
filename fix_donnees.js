const fs = require('fs');
let code = fs.readFileSync('lib/dashboard/donnees.ts', 'utf8');

code = code.replace(
  'import type {\n  DonneesGraphique,\n  PointGraphique, StatutProduit } from "@prisma/client";',
  'import type { StatutProduit } from "@prisma/client";'
);

code = code.replace(
  'import type {\n  Activite,\n  AlerteProduit,\n  DonneesDashboard,\n  Kpi,\n  PointMois,\n  TableauxDashboard,\n} from "./types";',
  'import type {\n  Activite,\n  AlerteProduit,\n  DonneesDashboard,\n  Kpi,\n  DonneesGraphique,\n  PointGraphique,\n  TableauxDashboard,\n} from "./types";'
);

fs.writeFileSync('lib/dashboard/donnees.ts', code);
