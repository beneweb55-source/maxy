"use client";

import type { StatutProduit } from "@prisma/client";
import { INFOS_STATUT, STATUTS_PRODUIT } from "@/lib/statuts";

interface FiltresRapidesProps {
  searchParams: URLSearchParams | null;
  statutsActifs: StatutProduit[];
  nbFiltresActifs: number;
  estSocial: boolean;
  onBasculerStatut: (statut: StatutProduit) => void;
  onMajUrl: (modifs: Record<string, string | null>) => void;
  onClearAll: () => void;
}

const QUICK_FILTERS: { key: string; label: string; color?: string }[] = [
  { key: "plus30j", label: "+30 jours" },
  { key: "a_classer", label: "À classer", color: "text-brand-orange" },
  { key: "a_tarifer", label: "À tarifer", color: "text-red-600 dark:text-red-400" },
  { key: "sans_photo", label: "Sans photo" },
  { key: "sans_etiquette", label: "Sans étiquette" },
  { key: "a_jeter", label: "À jeter" },
  { key: "en_vitrine", label: "En vitrine" },
];

export default function FiltresRapides({
  searchParams,
  statutsActifs,
  nbFiltresActifs,
  estSocial,
  onBasculerStatut,
  onMajUrl,
  onClearAll,
}: FiltresRapidesProps) {
  const statutsVisibles = estSocial
    ? (["en_vente", "vendu"] as readonly StatutProduit[])
    : STATUTS_PRODUIT;

  return (
    <div className="carte !p-4 bg-white/50 dark:bg-black/10 animate-entree">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey w-full sm:w-auto sm:mr-2">Statut</span>
          {statutsVisibles.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onBasculerStatut(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all hover-lift ${
                statutsActifs.includes(s)
                  ? "border-brand-black bg-brand-black text-brand-white shadow-md"
                  : "border-brand-light-grey dark:border-white/10 text-brand-warm-grey dark:text-brand-grey hover:bg-brand-light-grey/30 dark:hover:bg-white/5"
              }`}
            >
              {INFOS_STATUT[s].libelle}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t sm:border-t-0 sm:border-l border-brand-light-grey/50 dark:border-white/10 pt-4 sm:pt-0 sm:pl-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey">Période</label>
            <input
              type="date"
              value={searchParams?.get("du") ?? ""}
              onChange={(e) => onMajUrl({ du: e.target.value || null, page: "1" })}
              className="champ text-xs py-1 px-2 h-[32px] w-[110px]"
            />
            <span className="text-brand-warm-grey">-</span>
            <input
              type="date"
              value={searchParams?.get("au") ?? ""}
              onChange={(e) => onMajUrl({ au: e.target.value || null, page: "1" })}
              className="champ text-xs py-1 px-2 h-[32px] w-[110px]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-brand-light-grey/50 dark:border-white/10">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey w-full sm:w-auto sm:mr-2">Rapides</span>

        {QUICK_FILTERS.map((f) => (
          <label key={f.key} className={`flex items-center gap-2 text-sm font-medium cursor-pointer ${f.color ?? "text-brand-black dark:text-brand-warm-grey"}`}>
            <input
              type="checkbox"
              checked={searchParams?.get(f.key) === "1"}
              onChange={(e) => onMajUrl({ [f.key]: e.target.checked ? "1" : null, page: "1" })}
              className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
            />
            {f.label}
          </label>
        ))}

        {nbFiltresActifs > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-auto text-sm font-bold text-danger hover:bg-danger/10 px-3 py-1.5 rounded-md transition flex items-center gap-1.5 border border-transparent hover:border-danger/20"
          >
            Effacer tous les filtres
          </button>
        )}
      </div>
    </div>
  );
}
