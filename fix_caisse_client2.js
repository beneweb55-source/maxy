const fs = require('fs');
let code = fs.readFileSync('components/caisse/CaisseClient.tsx', 'utf8');

const regexGraph = /function GraphiqueLigne\(\{ series \}\: \{ series\: \{ mois\: string\; solde\: number \}\[\] \}\) \{[\s\S]*?\}\s*\)\;\s*\}/m;

const newGraph = `function formatLabel(cle: string, granularite: 'jour' | 'mois' | 'an'): string {
  if (granularite === 'an') return cle;
  const parts = cle.split("-");
  if (granularite === 'jour') {
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return d.toLocaleDateString("fr-FR", { day: 'numeric', month: "short", timeZone: "UTC" });
  }
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1));
  return date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
}

function GraphiqueLigne({ donnees }: { donnees: { jour: {label: string, solde: number}[], mois: {label: string, solde: number}[], an: {label: string, solde: number}[] } }) {
  const [granularite, setGranularite] = useState<'jour' | 'mois' | 'an'>('mois');
  const series = donnees ? donnees[granularite] : [];

  if (!series || series.length === 0) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune donnée pour cette période.</p>;
  }

  const largeur = 480;
  const hauteur = 180;
  const margeBas = 24;
  const margeHaut = 20;
  const valeurs = series.map((s) => s.solde);
  const minimum = Math.min(0, ...valeurs);
  const maximum = Math.max(1, ...valeurs);
  const pas = largeur / Math.max(1, series.length - 1);
  
  const y = (v: number) =>
    hauteur -
    margeBas -
    (maximum === minimum ? 0 : ((v - minimum) / (maximum - minimum)) * (hauteur - margeBas - margeHaut));
  
  const points = series.map((s, i) => \`\${i * pas},\${y(s.solde)}\`).join(" ");

  return (
    <div className="mt-3">
      <div className="flex justify-end gap-1 mb-2">
        <button
          type="button"
          onClick={() => setGranularite('jour')}
          className={\`px-2 py-1 text-xs rounded-md font-medium transition \${granularite === 'jour' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}\`}
        >
          Jour
        </button>
        <button
          type="button"
          onClick={() => setGranularite('mois')}
          className={\`px-2 py-1 text-xs rounded-md font-medium transition \${granularite === 'mois' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}\`}
        >
          Mois
        </button>
        <button
          type="button"
          onClick={() => setGranularite('an')}
          className={\`px-2 py-1 text-xs rounded-md font-medium transition \${granularite === 'an' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}\`}
        >
          Année
        </button>
      </div>
      <div className="overflow-x-auto pb-2">
        <svg viewBox={\`0 0 \${largeur} \${hauteur}\`} className="h-44 w-full min-w-[320px]" role="img">
          <polyline points={points} fill="none" stroke="#1770E5" strokeWidth={2.5} />
          {series.map((s, i) => {
            const isFirstOrLastOrMiddle = i === 0 || i === series.length - 1 || i % Math.ceil(series.length / 5) === 0;
            return (
              <g key={s.label}>
                <circle cx={i * pas} cy={y(s.solde)} r={isFirstOrLastOrMiddle ? 3.5 : 2} fill="#1770E5" />
                {isFirstOrLastOrMiddle && (
                  <text x={i * pas} y={y(s.solde) - 8} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize={10} fill="#2E2D2D">
                    {formaterDA(s.solde)}
                  </text>
                )}
                {isFirstOrLastOrMiddle && (
                  <text x={i * pas} y={hauteur - 5} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize={9} fill="#7A7878" transform={granularite === 'jour' && i !== 0 && i !== series.length - 1 ? \`rotate(-45 \${i * pas} \${hauteur - 5})\` : undefined}>
                    {formatLabel(s.label, granularite)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}`;

code = code.replace(regexGraph, newGraph);

fs.writeFileSync('components/caisse/CaisseClient.tsx', code);
