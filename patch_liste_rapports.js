const fs = require('fs');
let code = fs.readFileSync('components/rapports/ListeRapports.tsx', 'utf8');

code = code.replace(
  'decisions_prises: number;',
  `decisions_prises: number;
  resume: {
    ok: number;
    a_reparer: number;
    manque_piece: number;
    hs: number;
  };`
);

const oldThead = `<thead className="bg-brand-light-grey/25">
            <tr>
              <th className="entete-table">Lot</th>
              <th className="entete-table">Fournisseur</th>
              <th className="entete-table text-right">Produits</th>
              <th className="entete-table text-right">Valeur d'achat</th>
              <th className="entete-table text-right">Décisions</th>
            </tr>
          </thead>`;

const newThead = `<thead className="bg-brand-light-grey/25">
            <tr>
              <th className="entete-table">Lot</th>
              <th className="entete-table">Fournisseur</th>
              <th className="entete-table">Résumé des tests</th>
              <th className="entete-table text-right">Valeur d'achat</th>
              <th className="entete-table text-right">Décisions</th>
            </tr>
          </thead>`;

code = code.replace(oldThead, newThead);

const oldTbody = `<td className="px-3 py-2.5 text-right">{r.nb_produits}</td>`;

const newTbody = `<td className="px-3 py-2.5 text-sm text-brand-warm-grey">
                  {[
                    r.resume.ok > 0 && \`\${r.resume.ok} OK\`,
                    r.resume.a_reparer > 0 && \`\${r.resume.a_reparer} à réparer\`,
                    r.resume.manque_piece > 0 && \`\${r.resume.manque_piece} manque pièce\`,
                    r.resume.hs > 0 && \`\${r.resume.hs} HS\`
                  ].filter(Boolean).join(' · ')}
                </td>`;

code = code.replace(oldTbody, newTbody);

code = code.replace(
  `{new Date(r.date_entree).toLocaleDateString("fr-FR")}`,
  `Clôturé le {new Date(r.date_entree).toLocaleDateString("fr-FR")}`
);

fs.writeFileSync('components/rapports/ListeRapports.tsx', code);
