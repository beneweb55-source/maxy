const fs = require('fs');
let code = fs.readFileSync('components/rapports/RapportDetail.tsx', 'utf8');

// The original map part:
const originalListRegex = /<ul className="mt-3 divide-y divide-brand-light-grey\/50">[\s\S]*?<\/ul>/;

const newList = `{STATUTS_DECISION.some(s => rapport.produits.some(p => p.statut === s)) && (
          <div className="mt-4">
            <h4 className="font-bold mb-2">Décisions requises (À réparer, Manque pièce, HS)</h4>
            <ul className="divide-y divide-brand-light-grey/50">
              {rapport.produits.filter(p => STATUTS_DECISION.includes(p.statut)).map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={\`/produits/\${p.id}\`}
                        className="text-sm font-semibold transition hover:text-brand-crystal hover:underline print:no-underline"
                      >
                        <span className="font-mono text-xs text-brand-warm-grey">
                          {p.code_interne}
                        </span>{" "}
                        {p.reference}
                      </Link>
                      <p className="text-xs text-brand-warm-grey">
                        {p.categorie} · achat {formaterDA(p.prix_achat)}
                        {p.cout_reparations > 0 &&
                          \` · réparations \${formaterDA(p.cout_reparations)}\`}
                      </p>
                      {p.derniere_note && (
                        <p className="mt-1 flex items-start gap-1.5 text-xs text-brand-smooth font-semibold">
                          <IconeNote taille={13} className="mt-0.5 shrink-0 text-brand-warm-grey" />
                          {p.derniere_note}
                        </p>
                      )}
                    </div>
                    <BadgeStatut statut={p.statut} />
                  </div>
                  {enAttente && estGerant && (
                    <div className="mt-2 flex flex-wrap gap-3 print:hidden">
                      {(Object.keys(LIBELLES_DECISION) as DecisionRapport[]).map((d) => (
                        <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer border p-2 rounded hover:bg-brand-light-grey/20">
                          <input
                            type="radio"
                            name={\`decision-\${p.id}\`}
                            checked={decisions.get(p.id) === d}
                            onChange={() => setDecisions(new Map(decisions).set(p.id, d))}
                            className="accent-brand-orange"
                          />
                          {LIBELLES_DECISION[d]}
                        </label>
                      ))}
                    </div>
                  )}
                  {(!enAttente || !estGerant) && (
                    <p className="mt-1 text-xs">
                      Décision :{" "}
                      <span className="font-bold text-brand-orange">
                        {p.decision_rapport ? LIBELLES_DECISION[p.decision_rapport] : "en attente"}
                      </span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {['ok', 'en_vente', 'vendu'].some(s => rapport.produits.some(p => p.statut === s)) && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-bold mb-2">Produits OK (Aucune décision requise)</h4>
            <ul className="divide-y divide-brand-light-grey/50 text-sm">
              {rapport.produits.filter(p => !STATUTS_DECISION.includes(p.statut)).map((p) => (
                <li key={p.id} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-mono text-xs text-brand-warm-grey mr-2">{p.code_interne}</span>
                    <span className="font-semibold">{p.reference}</span>
                    {p.derniere_note && (
                      <span className="ml-2 text-xs text-brand-warm-grey italic">({p.derniere_note})</span>
                    )}
                  </div>
                  <BadgeStatut statut={p.statut} />
                </li>
              ))}
            </ul>
          </div>
        )}`;

code = code.replace(originalListRegex, newList);

// Fix the title for printing
code = code.replace(
  '<h2 className="hidden text-lg font-bold print:block">',
  `<div className="hidden print:flex mb-6 items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-brand-black">
              MAXY
            </h1>
            <p className="text-xs font-semibold tracking-widest text-brand-warm-grey">
              GESTION INFORMATIQUE
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase tracking-wider text-brand-black">Rapport de lot</h2>
            <p className="text-sm font-semibold text-brand-warm-grey">LOT N°{rapport.lot.id}</p>
          </div>
        </div>
        <h2 className="hidden text-lg font-bold print:block">`
);

fs.writeFileSync('components/rapports/RapportDetail.tsx', code);
