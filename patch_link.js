const fs = require('fs');
let code = fs.readFileSync('components/caisse/CaisseClient.tsx', 'utf8');

code = code.replace(
  'import type { Role, TypeMouvement } from "@prisma/client";',
  'import type { Role, TypeMouvement } from "@prisma/client";\nimport Link from "next/link";'
);

code = code.replace(
  '<a href="/caisse/rapport" className="btn btn-primaire">',
  '<Link href="/caisse/rapport" className="btn btn-primaire">'
);
code = code.replace(
  'Créer un rapport\n          </a>',
  'Créer un rapport\n          </Link>'
);

fs.writeFileSync('components/caisse/CaisseClient.tsx', code);
