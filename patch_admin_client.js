const fs = require('fs');
let code = fs.readFileSync('components/admin/AdminClient.tsx', 'utf8');

code = code.replace(
  'parametres: { marge_minimum_pct: number; objectif_reserve: number };',
  `parametres: { marge_minimum_pct: number; objectif_reserve: number; pct_reinvest: number; pct_reserve: number; pct_parts: number; pct_frais: number };`
);

code = code.replace(
  '  const [objectifReserve, setObjectifReserve] = useState("");\n  const [parametresCharges, setParametresCharges] = useState(false);',
  `  const [objectifReserve, setObjectifReserve] = useState("");
  const [pctReinvest, setPctReinvest] = useState("");
  const [pctReserve, setPctReserve] = useState("");
  const [pctParts, setPctParts] = useState("");
  const [pctFrais, setPctFrais] = useState("");
  const [parametresCharges, setParametresCharges] = useState(false);`
);

code = code.replace(
  '          setObjectifReserve(String(d.parametres.objectif_reserve));\n        }\n        return true;',
  `          setObjectifReserve(String(d.parametres.objectif_reserve));
          setPctReinvest(String(d.parametres.pct_reinvest));
          setPctReserve(String(d.parametres.pct_reserve));
          setPctParts(String(d.parametres.pct_parts));
          setPctFrais(String(d.parametres.pct_frais));
        }
        return true;`
);

code = code.replace(
  '        body: JSON.stringify({\n          marge_minimum_pct: Number(margeMin),\n          objectif_reserve: Number(objectifReserve),\n        }),',
  `        body: JSON.stringify({
          marge_minimum_pct: Number(margeMin),
          objectif_reserve: Number(objectifReserve),
          pct_reinvest: Number(pctReinvest),
          pct_reserve: Number(pctReserve),
          pct_parts: Number(pctParts),
          pct_frais: Number(pctFrais),
        }),`
);

// Now update the UI:
const oldUi = `          <div>
            <label className="libelle mb-1.5" htmlFor="objectif">
              Objectif de réserve (DA)
            </label>
            <input
              id="objectif"
              type="number"
              min={0}
              step={1}
              value={objectifReserve}
              onChange={(e) => setObjectifReserve(e.target.value)}
              className="champ w-44"
            />
          </div>
          <button
            type="button"
            disabled={
              envoi ||
              !margeMin ||
              !objectifReserve ||
              Number(margeMin) < 0 ||
              Number(margeMin) > 100 ||
              Number(objectifReserve) < 0
            }
            onClick={() => void enregistrerParametres()}
            className="btn btn-primaire"
          >
            <IconeEnregistrer taille={14} />
            Enregistrer
          </button>
        </div>
        <p className="mt-2 text-xs text-brand-warm-grey">
          La marge minimum déclenche la confirmation à la vente · l'objectif de réserve
          conditionne le versement des parts lors de la répartition mensuelle.
        </p>
      </section>`;

const newUi = `          <div>
            <label className="libelle mb-1.5" htmlFor="objectif">
              Objectif de réserve (DA)
            </label>
            <input
              id="objectif"
              type="number"
              min={0}
              step={1}
              value={objectifReserve}
              onChange={(e) => setObjectifReserve(e.target.value)}
              className="champ w-44"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="libelle mb-1.5">Répartition mensuelle par défaut (%)</label>
          <div className="flex flex-wrap items-end gap-3 p-3 rounded bg-brand-light-grey/20 border border-brand-light-grey">
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Réinvestissement</label>
              <input
                type="number" min={0} max={100}
                value={pctReinvest}
                onChange={(e) => setPctReinvest(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Réserve</label>
              <input
                type="number" min={0} max={100}
                value={pctReserve}
                onChange={(e) => setPctReserve(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Parts associés</label>
              <input
                type="number" min={0} max={100}
                value={pctParts}
                onChange={(e) => setPctParts(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-warm-grey mb-1 block">Frais divers</label>
              <input
                type="number" min={0} max={100}
                value={pctFrais}
                onChange={(e) => setPctFrais(e.target.value)}
                className="champ w-20 px-2 py-1 text-sm text-center"
              />
            </div>
            <div className="ml-auto text-sm">
              Total : <strong className={Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais) === 100 ? "text-emerald-600" : "text-red-600"}>
                {Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais)}%
              </strong>
            </div>
          </div>
        </div>

        <div className="mt-4 flex">
          <button
            type="button"
            disabled={
              envoi ||
              !margeMin ||
              !objectifReserve ||
              Number(margeMin) < 0 ||
              Number(margeMin) > 100 ||
              Number(objectifReserve) < 0 ||
              (Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais)) !== 100
            }
            onClick={() => void enregistrerParametres()}
            className="btn btn-primaire"
          >
            <IconeEnregistrer taille={14} />
            Enregistrer les paramètres
          </button>
        </div>
        <p className="mt-2 text-xs text-brand-warm-grey">
          La marge minimum déclenche la confirmation à la vente. L'objectif de réserve
          conditionne le versement des parts lors de la répartition mensuelle.
        </p>
      </section>`;

code = code.replace(oldUi, newUi);

fs.writeFileSync('components/admin/AdminClient.tsx', code);
