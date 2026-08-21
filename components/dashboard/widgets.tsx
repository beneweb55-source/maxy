"use client";
import React from 'react';

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StatutProduit } from "@prisma/client";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT } from "@/lib/statuts";
import {
  CATALOGUE_KPI,
  type ActionRapide,
  type CleKpi,
  type SourceGraphique,
  type SourceTableau,
  type Widget,
} from "@/lib/dashboard/config";
import type {
  Activite,
  AlerteProduit,
  DonneesDashboard,
  Kpi,
  LigneATarifer,
  LigneEnVente,
  LigneRapport,
  LigneVente,
  PointGraphique,
  DonneesGraphique,
} from "@/lib/dashboard/types";
import BadgeStatut from "@/components/BadgeStatut";
import { ICONES_ACTIVITE, IconeTendanceBas, IconeTendanceHaut } from "@/components/icons";
import { useT } from "@/lib/i18n/contexte";

export function RenduWidget({
  widget,
  donnees,
  role,
}: {
  widget: Widget;
  donnees: DonneesDashboard;
  role?: string;
}) {
  switch (widget.type) {
    case "kpis":
      return <BlocKpis cles={widget.cles} kpis={donnees.kpis} />;
    case "actions_rapides":
      return <ActionsRapides actions={widget.actions} compteurs={donnees.compteurs} />;
    case "graphique_barres":
      return <GraphiqueBarres source={widget.source} graphiques={donnees.graphiques} />;
    case "donut_statuts":
      return <DonutStatuts repartition={donnees.stock_par_statut ?? []} />;
    case "alertes":
      return <Alertes alertes={donnees.alertes} />;
    case "activites":
      return <Activites activites={donnees.activites ?? []} />;
    case "tableau":
      return <Tableau source={widget.source} donnees={donnees} role={role} />;
  }
}

export function widgetSansCarte(widget: Widget): boolean {
  return widget.type === "kpis" || widget.type === "actions_rapides";
}

function valeurFormatee(cle: CleKpi, valeur: number): string {
  const def = CATALOGUE_KPI[cle];
  if (def.format === "da") return formaterDA(valeur);
  if (def.format === "jours") return `${valeur} jour${valeur > 1 ? "s" : ""}`;
  return String(valeur);
}

function BlocKpis({
  cles,
  kpis,
}: {
  cles: CleKpi[];
  kpis: Partial<Record<CleKpi, Kpi>>;
}) {
  const t = useT();
  const visibles = cles.filter((c) => kpis[c] !== undefined);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {visibles.map((cle) => {
        const def = CATALOGUE_KPI[cle];
        const kpi = kpis[cle];
        if (!kpi) return null;
        const v = kpi.variation_pct;
        const inverse = "variationInversee" in def && def.variationInversee === true;
        const comparaison = def.comparaison !== false;
        const positive = v !== null && (inverse ? v < 0 : v > 0);
        const negative = v !== null && (inverse ? v > 0 : v < 0);
        return (
          <div key={cle} className="carte relative overflow-hidden group/kpi">
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-orange/5 to-transparent opacity-0 group-hover/kpi:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
            <p className="libelle text-brand-warm-grey/80 relative z-10">{t(def.libelle)}</p>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-brand-black font-outfit relative z-10">
              {valeurFormatee(cle, kpi.valeur)}
            </p>
            {comparaison && (
              <p
                className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold relative z-10 ${
                  positive ? "text-succes" : negative ? "text-danger" : "text-brand-grey"
                }`}
              >
                {v !== null && v > 0 && <IconeTendanceHaut taille={13} />}
                {v !== null && v < 0 && <IconeTendanceBas taille={13} />}
                {v === null ? "— vs mois précédent" : `${Math.abs(v)} % vs mois précédent`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActionsRapides({
  actions,
  compteurs,
}: {
  actions: ActionRapide[];
  compteurs: Record<string, number>;
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const compteur = action.badge ? (compteurs[action.badge] ?? 0) : null;
        return (
          <Link key={action.href + action.libelle} href={action.href} className="btn btn-secondaire hover-lift shadow-sm">
            {t(action.libelle)}
            {compteur !== null && compteur > 0 && (
              <span className="rounded-full bg-brand-orange px-1.5 py-0.5 text-xs font-bold text-white">
                {compteur}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function formatLabel(cle: string, granularite: 'jour' | 'mois' | 'an'): string {
  if (granularite === 'an') return cle;
  const parts = cle.split("-");
  if (granularite === 'jour') {
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return d.toLocaleDateString("fr-FR", { day: 'numeric', month: "short", timeZone: "UTC" });
  }
  const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1));
  return date.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
}

function GraphiqueBarres({
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

  if (!series || series.length === 0) {
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
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'jour' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Jour
        </button>
        <button
          type="button"
          onClick={() => setGranularite('mois')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'mois' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Mois
        </button>
        <button
          type="button"
          onClick={() => setGranularite('an')}
          className={`px-2 py-1 text-xs rounded-md font-medium transition ${granularite === 'an' ? 'bg-brand-orange text-white' : 'bg-brand-light-grey/30 text-brand-smooth hover:bg-brand-light-grey/50'}`}
        >
          Année
        </button>
      </div>
      <div className="overflow-x-auto pb-2">
        <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="h-40 w-full min-w-[320px]" role="img">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          {series.map((s, i) => {
            const h = maximum === 0 ? 0 : Math.round(((hauteur - margeBas - margeHaut) * s.valeur) / maximum);
            const x = i * pas + (pas - largeurBarre) / 2;
            const y = hauteur - margeBas - h;
            return (
              <g key={s.label} className="group cursor-default">
                <rect x={x} y={y} width={largeurBarre} height={h} rx={6} fill="url(#barGradient)" className="transition-all duration-300 group-hover:opacity-80 group-hover:filter group-hover:brightness-110" />
                {s.valeur > 0 && largeurBarre > 15 && (
                  <text x={x + largeurBarre / 2} y={y - 5} textAnchor="middle" fontSize={10} fill="#2E2D2D" className="hidden sm:block">
                    {formaterDA(s.valeur)}
                  </text>
                )}
                <text x={x + largeurBarre / 2} y={hauteur - 5} textAnchor="middle" fontSize={9} fill="#7C7572" transform={granularite === 'jour' ? `rotate(-45 ${x + largeurBarre / 2} ${hauteur - 5})` : undefined}>
                  {formatLabel(s.label, granularite)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function cheminArc(
  cx: number,
  cy: number,
  rayonExterieur: number,
  rayonInterieur: number,
  angleDebut: number,
  angleFin: number
): string {
  const point = (angle: number, rayon: number): [number, number] => [
    cx + rayon * Math.cos(angle),
    cy + rayon * Math.sin(angle),
  ];
  const [x0, y0] = point(angleDebut, rayonExterieur);
  const [x1, y1] = point(angleFin, rayonExterieur);
  const [xi1, yi1] = point(angleFin, rayonInterieur);
  const [xi0, yi0] = point(angleDebut, rayonInterieur);
  const grandArc = angleFin - angleDebut > Math.PI ? 1 : 0;
  return [
    `M ${x0} ${y0}`,
    `A ${rayonExterieur} ${rayonExterieur} 0 ${grandArc} 1 ${x1} ${y1}`,
    `L ${xi1} ${yi1}`,
    `A ${rayonInterieur} ${rayonInterieur} 0 ${grandArc} 0 ${xi0} ${yi0}`,
    "Z",
  ].join(" ");
}

function DonutStatuts({
  repartition,
}: {
  repartition: { statut: StatutProduit; nombre: number }[];
}) {
  const router = useRouter();
  const total = repartition.reduce((s, r) => s + r.nombre, 0);
  if (total === 0) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucun produit en stock.</p>;
  }

  let angle = -Math.PI / 2;
  const segments = repartition.map((r) => {
    const debut = angle;
    const fin = angle + (r.nombre / total) * Math.PI * 2 * 0.9999;
    angle = fin;
    return { ...r, debut, fin };
  });
  const versInventaire = (statut: StatutProduit) =>
    router.push(`/inventaire?statuts=${statut}`);

  return (
    <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0 drop-shadow-lg" role="img">
        {segments.map((s) => (
          <path
            key={s.statut}
            d={cheminArc(100, 100, 90, 55, s.debut, s.fin)}
            fill={INFOS_STATUT[s.statut].hex}
            className="cursor-pointer transition-opacity hover:opacity-75"
            onClick={() => versInventaire(s.statut)}
          >
            <title>{`${INFOS_STATUT[s.statut].libelle} : ${s.nombre}`}</title>
          </path>
        ))}
        <text x={100} y={95} textAnchor="middle" fontSize={26} fontWeight={700} className="fill-brand-black">
          {total}
        </text>
        <text x={100} y={115} textAnchor="middle" fontSize={11} className="fill-brand-grey">
          produits
        </text>
      </svg>
      <ul className="w-full space-y-1">
        {segments.map((s) => (
          <li key={s.statut}>
            <button
              type="button"
              onClick={() => versInventaire(s.statut)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-sm transition hover:bg-brand-glow/20"
            >
              <BadgeStatut statut={s.statut} />
              <span className="font-semibold">{s.nombre}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListeAlertes({
  titre,
  classe,
  produits,
}: {
  titre: string;
  classe: string;
  produits: AlerteProduit[];
}) {
  if (produits.length === 0) return null;
  return (
    <div>
      <h3 className={`text-xs font-bold uppercase tracking-wide ${classe}`}>{titre}</h3>
      <ul className="mt-1 divide-y divide-brand-light-grey/50">
        {produits.map((p) => (
          <li key={p.id}>
            <Link
              href={`/produits/${p.id}`}
              className="flex items-center justify-between py-1.5 text-sm transition hover:bg-brand-glow/20"
            >
              <span>
                <span className="font-mono text-xs text-brand-warm-grey">{p.code_interne}</span>{" "}
                {p.reference}
              </span>
              <span className={`shrink-0 font-semibold ${classe}`}>{p.jours} j</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Alertes({ alertes }: { alertes: DonneesDashboard["alertes"] }) {
  if (
    !alertes ||
    (alertes.stock_30j.length === 0 &&
      alertes.manque_piece_14j.length === 0 &&
      alertes.hs.length === 0)
  ) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune alerte. Tout va bien.</p>;
  }
  return (
    <div className="mt-3 space-y-4">
      <ListeAlertes
        titre="Produits HS"
        classe="text-danger"
        produits={alertes.hs}
      />
      <ListeAlertes
        titre="En stock depuis plus de 30 jours"
        classe="text-brand-orange"
        produits={alertes.stock_30j}
      />
      <ListeAlertes
        titre="Manque pièce depuis plus de 14 jours"
        classe="text-brand-crystal"
        produits={alertes.manque_piece_14j}
      />
    </div>
  );
}

function Activites({ activites }: { activites: Activite[] }) {
  if (activites.length === 0) {
    return <p className="mt-3 text-sm text-brand-warm-grey">Aucune activité récente.</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-brand-light-grey/50">
      {activites.map((a, i) => {
        const Icone = ICONES_ACTIVITE[a.type];
        return (
          <li key={i} className="flex items-start gap-3 py-2 text-sm">
            <span
              aria-hidden
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-glow to-brand-light-orange/30 text-brand-orange shadow-sm"
            >
              <Icone taille={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate" title={a.message}>
                {a.message}
              </p>
              <p className="text-xs text-brand-warm-grey">
                par {a.qui} ·{" "}
                {new Date(a.quand).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Tableau({ source, donnees, role }: { source: SourceTableau; donnees: DonneesDashboard; role?: string }) {
  switch (source) {
    case "produits_en_vente":
      return <TableauEnVente lignes={donnees.tableaux.produits_en_vente ?? []} role={role} />;
    case "rapports_a_valider":
      return <TableauRapports lignes={donnees.tableaux.rapports_a_valider ?? []} />;
    case "produits_a_tarifer":
      return <TableauATarifer lignes={donnees.tableaux.produits_a_tarifer ?? []} />;
    case "dernieres_ventes":
      return <TableauVentes lignes={donnees.tableaux.dernieres_ventes ?? []} role={role} />;
  }
}

function CadreTableau({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">{children}</table>
    </div>
  );
}

const CLASSE_ENTETE = "entete-table px-2 py-1.5";
const CLASSE_CELLULE = "px-2 py-1.5";

function Vide({ message }: { message: string }) {
  return <p className="mt-3 text-sm text-brand-warm-grey">{message}</p>;
}

function TableauEnVente({ lignes, role }: { lignes: LigneEnVente[]; role?: string }) {
  const estSocial = role === "social_media";
  if (lignes.length === 0) return <Vide message="Aucun produit en vente actuellement." />;
  return (
    <CadreTableau>
      <thead>
        <tr className="border-b border-brand-light-grey">
          <th className={CLASSE_ENTETE}>Produit</th>
          <th className={`${CLASSE_ENTETE} text-right`}>Prix fixé</th>
          {!estSocial && <th className={`${CLASSE_ENTETE} text-right`}>Marge prévue</th>}
          <th className={`${CLASSE_ENTETE} text-right`}>En vente depuis</th>
          <th className={CLASSE_ENTETE} />
        </tr>
      </thead>
      <tbody className="">
        {lignes.map((l) => (
          <tr key={l.id} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
            <td className={CLASSE_CELLULE}>
              <span className="font-mono text-xs text-brand-warm-grey">{l.code_interne}</span>{" "}
              {l.reference}
            </td>
            <td className={`${CLASSE_CELLULE} text-right font-semibold`}>
              {l.prix_vente_fixe !== null ? formaterDA(l.prix_vente_fixe) : "—"}
            </td>
            {!estSocial && (
              <td
                className={`${CLASSE_CELLULE} text-right font-semibold ${
                  l.marge_prevue >= 0 ? "text-succes" : "text-danger"
                }`}
              >
                {formaterDA(l.marge_prevue)}
              </td>
            )}
            <td className={`${CLASSE_CELLULE} text-right`}>{l.jours_en_vente} j</td>
            <td className={`${CLASSE_CELLULE} text-right`}>
              <Link href={`/ventes?vendre_produit_id=${l.id}`} className="lien text-sm">
                Vendre
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </CadreTableau>
  );
}

function TableauRapports({ lignes }: { lignes: LigneRapport[] }) {
  if (lignes.length === 0) return <Vide message="Aucun rapport en attente de validation." />;
  return (
    <CadreTableau>
      <thead>
        <tr className="border-b border-brand-light-grey">
          <th className={CLASSE_ENTETE}>Lot</th>
          <th className={CLASSE_ENTETE}>Fournisseur</th>
          <th className={`${CLASSE_ENTETE} text-right`}>Produits</th>
          <th className={`${CLASSE_ENTETE} text-right`}>Décisions</th>
          <th className={CLASSE_ENTETE} />
        </tr>
      </thead>
      <tbody className="">
        {lignes.map((l) => (
          <tr key={l.lot_id} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
            <td className={CLASSE_CELLULE}>
              n°{l.lot_id} —{" "}
              {new Date(l.date_entree).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </td>
            <td className={CLASSE_CELLULE}>{l.fournisseur}</td>
            <td className={`${CLASSE_CELLULE} text-right`}>{l.nb_produits}</td>
            <td
              className={`${CLASSE_CELLULE} text-right font-semibold ${
                l.decisions_prises < l.decisions_requises
                  ? "text-brand-orange"
                  : "text-succes"
              }`}
            >
              {l.decisions_prises}/{l.decisions_requises}
            </td>
            <td className={`${CLASSE_CELLULE} text-right`}>
              <Link href={`/rapports/${l.lot_id}`} className="lien text-sm">
                Valider
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </CadreTableau>
  );
}

function TableauATarifer({ lignes }: { lignes: LigneATarifer[] }) {
  if (lignes.length === 0) return <Vide message="Aucun produit en attente de prix." />;
  return (
    <CadreTableau>
      <thead>
        <tr className="border-b border-brand-light-grey">
          <th className={CLASSE_ENTETE}>Produit</th>
          <th className={`${CLASSE_ENTETE} text-right`}>Achat</th>
          <th className={`${CLASSE_ENTETE} text-right`}>Réparations</th>
          <th className={CLASSE_ENTETE} />
        </tr>
      </thead>
      <tbody className="">
        {lignes.map((l) => (
          <tr key={l.id} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
            <td className={CLASSE_CELLULE}>
              <span className="font-mono text-xs text-brand-warm-grey">{l.code_interne}</span>{" "}
              {l.reference}
            </td>
            <td className={`${CLASSE_CELLULE} text-right`}>{formaterDA(l.prix_achat)}</td>
            <td className={`${CLASSE_CELLULE} text-right`}>
              {l.cout_reparations > 0 ? formaterDA(l.cout_reparations) : "—"}
            </td>
            <td className={`${CLASSE_CELLULE} text-right`}>
              <Link href={`/produits/${l.id}`} className="lien text-sm">
                Fixer le prix
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </CadreTableau>
  );
}

function TableauVentes({ lignes, role }: { lignes: LigneVente[]; role?: string }) {
  const estSocial = role === "social_media";
  if (lignes.length === 0) return <Vide message="Aucune vente enregistrée." />;
  return (
    <CadreTableau>
      <thead>
        <tr className="border-b border-brand-light-grey">
          <th className={CLASSE_ENTETE}>Produit</th>
          <th className={`${CLASSE_ENTETE} text-right`}>Prix</th>
          {!estSocial && <th className={`${CLASSE_ENTETE} text-right`}>Marge</th>}
          <th className={CLASSE_ENTETE}>Vendeur</th>
          <th className={`${CLASSE_ENTETE} text-right`}>Date</th>
        </tr>
      </thead>
      <tbody className="">
        {lignes.map((l) => (
          <tr key={l.id} className={`ligne-table border-b border-brand-light-grey/30 last:border-0 ${l.annulee ? "text-brand-grey line-through" : ""}`}>
            <td className={CLASSE_CELLULE}>
              {l.reference}
              {l.annulee && (
                <span className="ml-1 rounded bg-danger/10 px-1 text-xs font-semibold text-danger no-underline">
                  annulée
                </span>
              )}
            </td>
            <td className={`${CLASSE_CELLULE} text-right`}>{formaterDA(l.prix_vente_reel)}</td>
            {!estSocial && (
              <td
                className={`${CLASSE_CELLULE} text-right font-semibold ${
                  l.annulee ? "" : l.marge >= 0 ? "text-succes" : "text-danger"
                }`}
              >
                {formaterDA(l.marge)}
              </td>
            )}
            <td className={CLASSE_CELLULE}>{l.vendeur}</td>
            <td className={`${CLASSE_CELLULE} text-right`}>
              {new Date(l.quand).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </td>
          </tr>
        ))}
      </tbody>
    </CadreTableau>
  );
}
