"use client";

import RechercheMultiModal from "./RechercheMultiModal";
import ActiveFilterBadges from "./ActiveFilterBadges";
import { IconeChevronBas } from "@/components/icons";
import { Filter as IconFilter, LayoutGrid, Table2 } from "lucide-react";

interface ToolbarInventaireProps {
  q: string;
  qLoc: string;
  lots: { id: number; libelle: string }[];
  selection: number[];
  nbFiltresActifs: number;
  tiroirFiltresOuvert: boolean;
  modeAffichage: "cartes" | "tableau";
  estCockpit: boolean;
  searchParamsRaw: { get: (k: string) => string | null };
  onQLocChange: (valeur: string) => void;
  onQChange: (valeur: string) => void;
  onMajUrl: (modifs: Record<string, string | null>) => void;
  onModeAffichageChange: (mode: "cartes" | "tableau") => void;
  onTiroirOuvrir: (ouvert: boolean) => void;
  onSelectionClear: () => void;
}

export default function ToolbarInventaire({
  q,
  qLoc,
  lots,
  selection,
  nbFiltresActifs,
  tiroirFiltresOuvert,
  modeAffichage,
  estCockpit,
  searchParamsRaw,
  onQLocChange,
  onQChange,
  onMajUrl,
  onModeAffichageChange,
  onTiroirOuvrir,
  onSelectionClear,
}: ToolbarInventaireProps) {
  return (
    <div className="space-y-2">
      <div className="carte !p-2 sm:!p-3 flex flex-col lg:flex-row gap-3 items-center shadow-sm z-20 relative">
        <div className="flex-1 w-full relative flex flex-col sm:flex-row gap-2">
          <RechercheMultiModal
            valeur={q}
            onInstantChange={onQLocChange}
            onChange={onQChange}
            className="flex-1"
          />

          {!estCockpit && (
            <div className="flex items-center self-stretch bg-brand-light-grey/20 dark:bg-white/5 rounded-xl p-1 border border-brand-light-grey/50 dark:border-white/10 shrink-0 gap-1">
              <div className="flex items-center h-full">
                <button
                  type="button"
                  onClick={() => onModeAffichageChange("cartes")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all h-full ${modeAffichage === "cartes" ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"}`}
                  title="Vue Cartes"
                  aria-label="Vue Cartes"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onModeAffichageChange("tableau")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all h-full ${modeAffichage === "tableau" ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"}`}
                  title="Vue Tableau"
                  aria-label="Vue Tableau"
                >
                  <Table2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Barre d'actions groupées si sélection */}
        {selection.length > 0 && (
          <div className="absolute inset-0 bg-brand-orange dark:bg-brand-orange z-30 rounded-lg flex items-center justify-between px-4 animate-entree text-white shadow-lg">
            <div className="flex items-center gap-4">
              <span className="font-bold">{selection.length} sélectionné{selection.length > 1 ? 's' : ''}</span>
              <button type="button" onClick={onSelectionClear} className="text-white/80 hover:text-white text-sm">Annuler</button>
            </div>
          </div>
        )}

        {!estCockpit && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Sélecteur d'arrivage / lot */}
            <div className="relative flex-1 sm:flex-none flex items-center border border-brand-light-grey dark:border-white/10 rounded-xl bg-white dark:bg-brand-paper px-3 py-2 h-[44px]">
              <select
                value={""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__sans__") onMajUrl({ sans_lot: "1", lot: null, page: "1" });
                  else onMajUrl({ lot: v || null, sans_lot: null, page: "1" });
                }}
                className="bg-transparent text-xs sm:text-sm text-brand-black dark:text-white font-medium focus:outline-none w-full cursor-pointer appearance-none pr-4"
              >
                <option value="">Tous les arrivages</option>
                <option value="__sans__">Sans arrivage (Indépendant)</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>{l.libelle}</option>
                ))}
              </select>
              <IconeChevronBas taille={14} className="absolute right-3 text-brand-warm-grey pointer-events-none" />
            </div>

            {/* Tri */}
            <div className="relative flex-1 sm:flex-none flex items-center border border-brand-light-grey dark:border-white/10 rounded-xl bg-white dark:bg-brand-paper px-3 py-2 h-[44px]">
              <select
                value={""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "prix_asc") onMajUrl({ tri: "prix_achat", ordre: "asc", page: "1" });
                  else if (v === "prix_desc") onMajUrl({ tri: "prix_achat", ordre: "desc", page: "1" });
                  else onMajUrl({ tri: null, ordre: null, page: "1" });
                }}
                className="bg-transparent text-xs sm:text-sm text-brand-black dark:text-white font-medium focus:outline-none w-full cursor-pointer appearance-none pr-4"
              >
                <option value="">Trier par défaut</option>
                <option value="prix_asc">Prix croissant</option>
                <option value="prix_desc">Prix décroissant</option>
              </select>
              <IconeChevronBas taille={14} className="absolute right-3 text-brand-warm-grey pointer-events-none" />
            </div>

            {/* Bouton d'ouverture du tiroir de filtres avec compteur */}
            <button
              type="button"
              onClick={() => onTiroirOuvrir(true)}
              className={`flex-none min-h-[44px] flex items-center gap-2 border rounded-xl px-4 py-2 transition-all text-xs sm:text-sm font-bold active:scale-95 ${
                tiroirFiltresOuvert || nbFiltresActifs > 0
                ? 'border-brand-orange bg-brand-orange/10 text-brand-orange shadow-inner'
                : 'border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper text-brand-warm-grey hover:bg-brand-light-grey/30 hover:text-brand-black dark:hover:text-white'
              }`}
            >
              <IconFilter className="w-4 h-4" />
              <span>Filtres</span>
              {nbFiltresActifs > 0 && (
                <span className="bg-brand-orange text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black ml-0.5">
                  {nbFiltresActifs}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Barre de badges des filtres actifs */}
      <ActiveFilterBadges
        searchParams={searchParamsRaw}
        majUrl={onMajUrl}
      />
    </div>
  );
}
