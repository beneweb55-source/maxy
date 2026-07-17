const fs = require('fs');
let code = fs.readFileSync('app/api/rapports/route.ts', 'utf8');

code = code.replace(
  'valeur_achat: lot.produits.reduce((s, p) => s + p.prix_achat, 0),',
  `valeur_achat: lot.produits.reduce((s, p) => s + p.prix_achat, 0),
          resume: {
            ok: lot.produits.filter((p) => p.statut === "ok").length,
            a_reparer: lot.produits.filter((p) => p.statut === "a_reparer").length,
            manque_piece: lot.produits.filter((p) => p.statut === "manque_piece").length,
            hs: lot.produits.filter((p) => p.statut === "hs").length,
          },`
);

fs.writeFileSync('app/api/rapports/route.ts', code);
