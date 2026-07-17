const fs = require('fs');
let code = fs.readFileSync('components/dashboard/widgets.tsx', 'utf8');

code = code.replace(
  '  PointMois,\n} from "@/lib/dashboard/types";',
  '  PointGraphique,\n  DonneesGraphique,\n} from "@/lib/dashboard/types";'
);

code = code.replace(
  `function libelleMois(cle: string): string {
  const [annee, mois] = cle.split("-");
  const date = new Date(Date.UTC(Number(annee), Number(mois) - 1, 1));
  return date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
}`,
  `function formatLabel(cle: string, granularite: 'jour' | 'mois' | 'an'): string {
  if (granularite === 'an') return cle;
  const parts = cle.split("-");
  if (granularite === 'jour') {
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return d.toLocaleDateString("fr-FR", { day: 'numeric', month: "short", timeZone: "UTC" });
  }
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1));
  return date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
}`
);

const oldGraph = `function GraphiqueBarres({
  source,
  graphiques,
}: {
  source: SourceGraphique;
  graphiques: DonneesDashboard["graphiques"];
}) {
  const series: PointMois[] = graphiques[source] ?? [];
  if (series.length === 0) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune donnée disponible.</p>;
  }
  const largeur = 480;
  const hauteur = 200;
  const margeBas = 24;
  const margeHaut = 20;
  const maximum = Math.max(1, ...series.map((s) => s.valeur));
  const pas = largeur / series.length;
  const largeurBarre = pas * 0.55;
  return (
    <div className="mt-3 overflow-x-auto">
      <svg viewBox={\`0 0 \${largeur} \${hauteur}\`} className="h-48 w-full min-w-[320px]" role="img">
        {series.map((s, i) => {
          const h = Math.round(((hauteur - margeBas - margeHaut) * s.valeur) / maximum);
          const x = i * pas + (pas - largeurBarre) / 2;
          const y = hauteur - margeBas - h;
          return (
            <g key={s.mois}>
              <rect x={x} y={y} width={largeurBarre} height={h} rx={4} fill="#F86822" />
              <text x={x + largeurBarre / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="#2E2D2D">
                {s.valeur > 0 ? formaterDA(s.valeur) : ""}
              </text>
              <text x={x + largeurBarre / 2} y={hauteur - 5} textAnchor="middle" fontSize={11} fill="#7A7878">
                {libelleMois(s.mois)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}`;

const newGraph = `function GraphiqueBarres({
  source,
  graphiques,
}: {
  source: SourceGraphique;
  graphiques: DonneesDashboard["graphiques"];
}) {
  const [granularite, setGranularite] = React.useState<'jour' | 'mois' | 'an'>('mois');
  const donnees = graphiques[source];

  if (!donnees) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune donnée disponible.</p>;
  }

  const series = donnees[granularite];

  if (series.length === 0) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune donnée disponible pour cette période.</p>;
  }

  const largeur = 480;
  const hauteur = 200;
  const margeBas = 24;
  const margeHaut = 20;
  const maximum = Math.max(1, ...series.map((s) => s.valeur));
  const pas = largeur / Math.max(1, series.length);
  const largeurBarre = Math.min(pas * 0.75, 40);

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
        <svg viewBox={\`0 0 \${largeur} \${hauteur}\`} className="h-48 w-full min-w-[320px]" role="img">
          {series.map((s, i) => {
            const h = maximum === 0 ? 0 : Math.round(((hauteur - margeBas - margeHaut) * s.valeur) / maximum);
            const x = i * pas + (pas - largeurBarre) / 2;
            const y = hauteur - margeBas - h;
            return (
              <g key={s.label}>
                <rect x={x} y={y} width={largeurBarre} height={h} rx={4} fill="#F86822" />
                {s.valeur > 0 && largeurBarre > 15 && (
                  <text x={x + largeurBarre / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="#2E2D2D" className="hidden sm:block">
                    {formaterDA(s.valeur)}
                  </text>
                )}
                <text x={x + largeurBarre / 2} y={hauteur - 5} textAnchor="middle" fontSize={9} fill="#7A7878" transform={granularite === 'jour' ? \`rotate(-45 \${x + largeurBarre / 2} \${hauteur - 5})\` : undefined}>
                  {formatLabel(s.label, granularite)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}`;

code = code.replace(oldGraph, newGraph);

code = `import React from 'react';\n` + code;

fs.writeFileSync('components/dashboard/widgets.tsx', code);
