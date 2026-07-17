const fs = require('fs');
let code = fs.readFileSync('components/admin/AdminClient.tsx', 'utf8');

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
            disabled={envoi || !margeMin.toString().trim() || !objectifReserve.toString().trim() || !pctReinvest.toString().trim() || !pctReserve.toString().trim() || !pctParts.toString().trim() || !pctFrais.toString().trim() || (Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais) !== 100)}
            onClick={() => void enregistrerParametres()}
            className="btn btn-primaire"
          >
            <IconeEnregistrer taille={15} />
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
            <div className="ml-auto text-sm flex items-center gap-4">
              <div>
                Total : <strong className={Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais) === 100 ? "text-emerald-600" : "text-red-600"}>
                  {Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais)}%
                </strong>
              </div>
              <button
                type="button"
                disabled={envoi || !margeMin.toString().trim() || !objectifReserve.toString().trim() || !pctReinvest.toString().trim() || !pctReserve.toString().trim() || !pctParts.toString().trim() || !pctFrais.toString().trim() || (Number(pctReinvest) + Number(pctReserve) + Number(pctParts) + Number(pctFrais) !== 100)}
                onClick={() => void enregistrerParametres()}
                className="btn btn-primaire"
              >
                <IconeEnregistrer taille={15} />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-brand-warm-grey">
          La marge minimum déclenche la confirmation à la vente. L'objectif de réserve
          conditionne le versement des parts lors de la répartition mensuelle.
        </p>
      </section>`;

code = code.replace(oldUi, newUi);

fs.writeFileSync('components/admin/AdminClient.tsx', code);
