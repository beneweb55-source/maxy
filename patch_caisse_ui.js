const fs = require('fs');
let code = fs.readFileSync('components/caisse/CaisseClient.tsx', 'utf8');

// 1. Update the table to be interactive
const tableStr = `              {benefice > 0 && (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-brand-light-grey/50">
                    <tr>
                      <td className="py-1 text-brand-warm-grey">Réinvestissement (50 %)</td>
                      <td className="py-1 text-right font-semibold">{formaterDA(reinvest)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-brand-warm-grey">Fonds de réserve (20 %)</td>
                      <td className="py-1 text-right font-semibold">
                        {formaterDA(decoupe.reserve)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-brand-warm-grey">Parts des 4 associés (20 %)</td>
                      <td className="py-1 text-right font-semibold">
                        {formaterDA(decoupe.parts)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-brand-warm-grey">Frais divers (10 %)</td>
                      <td className="py-1 text-right font-semibold">
                        {formaterDA(decoupe.frais)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}`;

const newTableStr = `              {benefice > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-brand-light-grey/20 p-2 rounded text-sm">
                    <span className="text-brand-warm-grey">Total des pourcentages</span>
                    <span className={\`font-bold \${pctReinvest + pctReserve + pctParts + pctFrais !== 100 ? "text-red-600" : "text-emerald-600"}\`}>
                      {pctReinvest + pctReserve + pctParts + pctFrais} %
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-brand-light-grey/50">
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Réinvestissement
                          <input type="number" min="0" max="100" value={pctReinvest} onChange={e => setPctReinvest(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">{formaterDA(Math.round(benefice * (pctReinvest / 100)))}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Fonds de réserve
                          <input type="number" min="0" max="100" value={pctReserve} onChange={e => setPctReserve(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctReserve / 100)))}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Parts associés
                          <input type="number" min="0" max="100" value={pctParts} onChange={e => setPctParts(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctParts / 100)))}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-brand-warm-grey flex items-center gap-2">
                          Frais divers
                          <input type="number" min="0" max="100" value={pctFrais} onChange={e => setPctFrais(Number(e.target.value))} className="w-16 champ px-1 py-0.5 text-center" /> %
                        </td>
                        <td className="py-2 text-right font-semibold">
                          {formaterDA(Math.round(benefice * (pctFrais / 100)))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}`;

code = code.replace(tableStr, newTableStr);

// 2. Change the applying button
const buttonStr = `              {estGerant ? (
                <button
                  type="button"
                  disabled={envoi || benefice <= 0}
                  onClick={() => void appliquerRepartition(false)}
                  title={benefice <= 0 ? "Aucun bénéfice à répartir ce mois-ci" : undefined}
                  className="btn btn-primaire w-full"
                >
                  Appliquer la répartition
                </button>
              ) : (`;

const newButtonStr = `              {estGerant ? (
                <button
                  type="button"
                  disabled={envoi || benefice <= 0 || (pctReinvest + pctReserve + pctParts + pctFrais !== 100)}
                  onClick={() => {
                    setConfirmationRepartition(
                      \`Confirmez-vous la répartition de \${formaterDA(benefice)} avec ces pourcentages : Réinvest. (\${pctReinvest}%), Réserve (\${pctReserve}%), Parts (\${pctParts}%), Frais (\${pctFrais}%) ?\`
                    );
                  }}
                  title={benefice <= 0 ? "Aucun bénéfice à répartir ce mois-ci" : undefined}
                  className="btn btn-primaire w-full"
                >
                  Appliquer la répartition
                </button>
              ) : (`;

code = code.replace(buttonStr, newButtonStr);

// 3. Add the Rapport button
const exportStr = `        <a href="/api/caisse/export" className="btn btn-secondaire">
          <IconeTelechargement taille={15} />
          Export CSV
        </a>`;

const newExportStr = `        <div className="flex gap-2">
          <a href="/caisse/rapport" className="btn btn-primaire">
            Créer un rapport
          </a>
          <a href="/api/caisse/export" className="btn btn-secondaire">
            <IconeTelechargement taille={15} />
            Export CSV
          </a>
        </div>`;

code = code.replace(exportStr, newExportStr);

fs.writeFileSync('components/caisse/CaisseClient.tsx', code);
