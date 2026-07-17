const fs = require('fs');
let code = fs.readFileSync('components/rapports/ListeRapports.tsx', 'utf8');

const oldThead = `<thead className="bg-brand-light-grey/25">
            <tr>
              <th className="entete-table">Lot</th>
              <th className="entete-table">Fournisseur</th>
              <th className="entete-table">Résumé des tests</th>
              <th className="entete-table text-right">Valeur d'achat</th>
              <th className="entete-table text-right">Décisions</th>
            </tr>
          </thead>`;

const newThead = `<thead className="bg-brand-light-grey/25">
            <tr>
              <th className="entete-table">Lot</th>
              <th className="entete-table">Fournisseur</th>
              <th className="entete-table text-center">Statut</th>
              <th className="entete-table">Résumé des tests</th>
              <th className="entete-table text-right">Valeur d'achat</th>
              <th className="entete-table text-right">Décisions</th>
            </tr>
          </thead>`;

code = code.replace(oldThead, newThead);

const oldTbody = `<td className="px-3 py-2.5 text-sm text-brand-warm-grey">`;
const newTbody = `<td className="px-3 py-2.5 text-center">
                  <span className={\`px-2 py-1 text-xs font-semibold rounded-full \${r.statut_lot === 'teste' ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}\`}>
                    {r.statut_lot === 'teste' ? 'À valider' : 'Validé'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm text-brand-warm-grey">`;

code = code.replace(oldTbody, newTbody);

fs.writeFileSync('components/rapports/ListeRapports.tsx', code);
