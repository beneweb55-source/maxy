const fs = require('fs');
let code = fs.readFileSync('components/caisse/CaisseClient.tsx', 'utf8');

code = code.replace(
  `                  <p className="text-sm font-semibold">Modifier la répartition (total: {pctReinvest + pctReserve + pctParts + pctFrais}%)</p>`,
  `                  <p className="text-sm font-semibold">Modifier la répartition (total: {pctReinvest + pctReserve + pctParts + pctFrais}%)</p>
                  <div className="rounded bg-brand-light-grey/20 p-3 text-xs space-y-1 mb-2">
                    <p><strong>Simulation sur {formaterDA(benefice)} :</strong></p>
                    <ul className="list-disc pl-4 text-brand-warm-grey">
                      <li>Réinvestissement ({pctReinvest}%) : {formaterDA(benefice * (pctReinvest / 100))}</li>
                      <li>Réserve ({pctReserve}%) : {formaterDA(benefice * (pctReserve / 100))}</li>
                      <li>Parts ({pctParts}%) : {formaterDA(benefice * (pctParts / 100))}</li>
                      <li>Frais ({pctFrais}%) : {formaterDA(benefice * (pctFrais / 100))}</li>
                    </ul>
                  </div>`
);

code = code.replace(
  `                  <button
                    type="button"
                    disabled={envoi || (pctReinvest + pctReserve + pctParts + pctFrais !== 100)}
                    onClick={() => void appliquerRepartition(false)}
                    className="btn btn-primaire mt-2"
                  >
                    Appliquer la répartition détaillée
                  </button>`,
  `                  <button
                    type="button"
                    disabled={envoi || (pctReinvest + pctReserve + pctParts + pctFrais !== 100)}
                    onClick={() => {
                      setConfirmationRepartition(\`Confirmez-vous la répartition de \${formaterDA(benefice)} selon ces pourcentages (\${pctReinvest}% / \${pctReserve}% / \${pctParts}% / \${pctFrais}%) ?\`);
                    }}
                    className="btn btn-primaire mt-2"
                  >
                    Appliquer la répartition détaillée
                  </button>`
);

fs.writeFileSync('components/caisse/CaisseClient.tsx', code);
