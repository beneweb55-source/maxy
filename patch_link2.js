const fs = require('fs');
let code = fs.readFileSync('components/caisse/RapportCaisse.tsx', 'utf8');

code = code.replace(
  'import { IconeChevronGauche } from "@/components/icons";',
  'import { IconeChevronGauche } from "@/components/icons";\nimport Link from "next/link";'
);

code = code.replace(
  '<a href="/caisse" className="btn btn-secondaire">',
  '<Link href="/caisse" className="btn btn-secondaire">'
);
code = code.replace(
  'Retour à la caisse\n        </a>',
  'Retour à la caisse\n        </Link>'
);

fs.writeFileSync('components/caisse/RapportCaisse.tsx', code);
