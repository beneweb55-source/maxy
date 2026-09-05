import { useEffect, useState } from "react";
import { 
  IconePlus, 
  IconeRecherche, 
  IconeArchive, 
  IconeCocheCercle, 
  IconePanier, 
  IconeImage, 
  IconeAlerte, 
  IconeEtiquette, 
  IconeCle, 
  IconeMinuteur,
  IconeChevronDroite,
  IconeChevronBas,
  IconeTableauDeBord
} from "@/components/icons";
import { useT } from "@/lib/i18n/contexte";

export interface SousCategorieItem {
  id: number;
  nom: string;
  total: number;
  modelesCount: number;
  image_url: string | null;
}

export interface CategorieItem {
  id: number;
  nom: string;
  total: number;
  modelesCount: number;
  image_url: string | null;
  sousCategories: SousCategorieItem[];
}

export interface FamilleArbo {
  id: number;
  nom: string;
  description: string | null;
  image_url: string | null;
  total: number;
  modelesCount: number;
  categories: CategorieItem[];
}

interface StatsData {
  summary: { total: number; disponibles: number; en_vente: number };
  actions: { 
    sans_prix: number; 
    a_tester: number; 
    a_reparer: number; 
    sans_photo: number; 
    sans_etiquette: number; 
  };
  categories: { name: string; total: number; disponibles: number; image: string | null }[];
  familles?: FamilleArbo[];
}

import { 
  Laptop, 
  HardDrive, 
  Server, 
  Zap, 
  Cpu, 
  Printer, 
  Monitor, 
  CircuitBoard, 
  Globe, 
  Package, 
  Archive, 
  CheckCircle2, 
  ShoppingCart, 
  AlertTriangle, 
  Clock, 
  Wrench, 
  Image as ImageIcon, 
  Tag, 
  ChevronRight 
} from "lucide-react";

// Thèmes visuels épurés pour les 9 Grandes Familles (Palette POS tactile moderne)
const FAMILLE_THEMES: Record<string, { bgSoft: string; iconBg: string; IconComponent: React.ComponentType<{ className?: string }>; textAccent: string; badgeBg: string }> = {
  "ORDINATEURS": {
    bgSoft: "hover:border-blue-400/80 dark:hover:border-blue-500/80",
    iconBg: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
    IconComponent: Laptop,
    textAccent: "group-hover:text-blue-600 dark:group-hover:text-blue-400",
    badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  },
  "STOCKAGE": {
    bgSoft: "hover:border-cyan-400/80 dark:hover:border-cyan-500/80",
    iconBg: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-300",
    IconComponent: HardDrive,
    textAccent: "group-hover:text-cyan-600 dark:group-hover:text-cyan-400",
    badgeBg: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300",
  },
  "SERVEURS": {
    bgSoft: "hover:border-purple-400/80 dark:hover:border-purple-500/80",
    iconBg: "bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-300",
    IconComponent: Server,
    textAccent: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
    badgeBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
  },
  "ALIMENTATION & CÂBLES": {
    bgSoft: "hover:border-amber-400/80 dark:hover:border-amber-500/80",
    iconBg: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
    IconComponent: Zap,
    textAccent: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  },
  "MÉMOIRE": {
    bgSoft: "hover:border-emerald-400/80 dark:hover:border-emerald-500/80",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
    IconComponent: Cpu,
    textAccent: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  "IMPRESSION": {
    bgSoft: "hover:border-rose-400/80 dark:hover:border-rose-500/80",
    iconBg: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
    IconComponent: Printer,
    textAccent: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
    badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  },
  "PÉRIPHÉRIQUES": {
    bgSoft: "hover:border-sky-400/80 dark:hover:border-sky-500/80",
    iconBg: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
    IconComponent: Monitor,
    textAccent: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
    badgeBg: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  },
  "COMPOSANTS INTERNES": {
    bgSoft: "hover:border-violet-400/80 dark:hover:border-violet-500/80",
    iconBg: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
    IconComponent: CircuitBoard,
    textAccent: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
    badgeBg: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  },
  "RÉSEAU & INFRASTRUCTURE": {
    bgSoft: "hover:border-teal-400/80 dark:hover:border-teal-500/80",
    iconBg: "bg-teal-500/10 text-teal-600 dark:bg-teal-400/15 dark:text-teal-300",
    IconComponent: Globe,
    textAccent: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
    badgeBg: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
  },
};

const THEME_DEFAUT = {
  bgSoft: "hover:border-slate-400",
  iconBg: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/15 dark:text-slate-200",
  IconComponent: Package,
  textAccent: "group-hover:text-brand-orange",
  badgeBg: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
};

export default function Cockpit({ 
  majUrl, 
  q = "", 
  afficherFamilles, 
  setAfficherFamilles 
}: { 
  majUrl: (modifs: Record<string, string | null>) => void; 
  q?: string;
  afficherFamilles: boolean;
  setAfficherFamilles: (val: boolean) => void;
}) {
  const t = useT();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    
    setLoading(true);
    setErreur(null);
    
    const params = new URLSearchParams();
    if (q?.trim()) {
      params.set("q", q.trim());
    }
    const url = params.toString() ? `/api/produits/stats?${params.toString()}` : "/api/produits/stats";
    
    fetch(url, { signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Erreur de chargement des statistiques");
        return r.json();
      })
      .then((d) => {
        if (signal.aborted) return;
        setStats(d);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        console.error(e);
        setErreur(e.message || "Erreur réseau");
        setLoading(false);
      });

    return () => controller.abort();
  }, [q]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-28 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-28 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
        </div>
        <div className="h-6 w-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-md mt-8 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-36 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-36 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-36 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="carte flex flex-col items-center justify-center p-12 text-danger animate-entree">
        <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
          <IconeAlerte taille={32} className="opacity-80" />
        </div>
        <div className="text-lg font-bold font-outfit mb-1">Impossible de charger le cockpit</div>
        <div className="text-sm">{erreur}</div>
      </div>
    );
  }

  if (!stats) return null;

  // Filtrer les familles (masquage dynamique des nœuds à 0 ou filtrage par recherche)
  const famillesAffichees = (stats.familles || []).filter((f) => {
    if (f.total <= 0) return false;
    if (!q.trim()) return true;
    const qLower = q.toLowerCase();
    return (
      f.nom.toLowerCase().includes(qLower) ||
      f.categories.some(
        (c) =>
          c.nom.toLowerCase().includes(qLower) ||
          c.sousCategories.some((sc) => sc.nom.toLowerCase().includes(qLower))
      )
    );
  });

  return (
    <div className="space-y-8 animate-entree pb-8">
      {/* 1. Résumé Global du Stock (KPIs) */}
      <div>
        <h2 className="text-lg font-bold text-brand-black dark:text-white mb-3 font-outfit">
          Aperçu du stock
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className="carte relative overflow-hidden group cursor-pointer bg-brand-black text-white dark:bg-brand-paper dark:text-white border border-brand-light-grey/30 dark:border-white/10 !p-5 rounded-2xl transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
            onClick={() => majUrl({ vue: "tableau", statuts: null, famille_id: null, categorie_id: null, sous_categorie_id: null })}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-grey dark:text-brand-warm-grey mb-1">
                  Stock Total
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-outfit">
                  {stats.summary.total}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 dark:bg-white/5 flex items-center justify-center text-white/80">
                <IconeArchive taille={24} />
              </div>
            </div>
            <div className="text-[11px] text-white/60 dark:text-white/40 mt-3 flex items-center gap-1 font-medium">
              <span>Articles physiques en rayon & réserve</span>
            </div>
          </div>

          <div 
            className="carte relative overflow-hidden group cursor-pointer border border-emerald-300/60 bg-emerald-50/60 dark:bg-brand-paper dark:border-emerald-500/30 !p-5 rounded-2xl transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
            onClick={() => majUrl({ vue: "tableau", statuts: "ok,recu,en_test,en_vente", famille_id: null, categorie_id: null, sous_categorie_id: null })}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
                  Disponibles
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-800 dark:text-emerald-400 font-outfit">
                  {stats.summary.disponibles}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <IconeCocheCercle taille={24} />
              </div>
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/70 mt-3 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Prêts pour la vente comptoir</span>
            </div>
          </div>

          <div 
            className="carte relative overflow-hidden group cursor-pointer border border-brand-orange/30 bg-orange-50/40 dark:bg-brand-paper dark:border-brand-orange/30 !p-5 rounded-2xl transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
            onClick={() => majUrl({ vue: "tableau", statuts: "en_vente", famille_id: null, categorie_id: null, sous_categorie_id: null })}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-orange mb-1">
                  En Vente / Vitrine
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-brand-orange font-outfit">
                  {stats.summary.en_vente}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-orange/15 text-brand-orange flex items-center justify-center">
                <IconePanier taille={24} />
              </div>
            </div>
            <div className="text-[11px] text-brand-orange/80 mt-3 flex items-center gap-1 font-medium">
              <span>Articles exposés au public</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Actions Prioritaires à Traiter */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-bold text-brand-black dark:text-white font-outfit">
            À traiter en priorité
          </h2>
          {Object.values(stats.actions).some((v) => v > 0) && (
            <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
              Action requise
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.actions.sans_prix > 0 && (
            <button 
              type="button"
              onClick={() => majUrl({ vue: "atraiter", a_tarifer: "1", statuts: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
              className="carte group border border-red-200 dark:border-red-900/40 bg-white dark:bg-brand-paper !p-4 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between active:scale-[0.98] min-h-[90px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <IconeAlerte taille={16} /> Sans prix
                </span>
                <span className="text-lg font-black text-brand-black dark:text-white font-outfit">
                  {stats.actions.sans_prix}
                </span>
              </div>
              <div className="text-[11px] text-brand-warm-grey mt-2">Tarifs à fixer ›</div>
            </button>
          )}
          
          {stats.actions.a_tester > 0 && (
            <button 
              type="button"
              onClick={() => majUrl({ vue: "atraiter", statuts: "en_test", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
              className="carte group border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-brand-paper !p-4 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between active:scale-[0.98] min-h-[90px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <IconeMinuteur taille={16} /> À tester
                </span>
                <span className="text-lg font-black text-brand-black dark:text-white font-outfit">
                  {stats.actions.a_tester}
                </span>
              </div>
              <div className="text-[11px] text-brand-warm-grey mt-2">Banc d'essai ›</div>
            </button>
          )}
          
          {stats.actions.a_reparer > 0 && (
            <button 
              type="button"
              onClick={() => majUrl({ vue: "atraiter", statuts: "a_reparer", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
              className="carte group border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-brand-paper !p-4 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between active:scale-[0.98] min-h-[90px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                  <IconeCle taille={16} /> À réparer
                </span>
                <span className="text-lg font-black text-brand-black dark:text-white font-outfit">
                  {stats.actions.a_reparer}
                </span>
              </div>
              <div className="text-[11px] text-brand-warm-grey mt-2">Maintenance ›</div>
            </button>
          )}
          
          {stats.actions.sans_photo > 0 && (
            <button 
              type="button"
              onClick={() => majUrl({ vue: "atraiter", sans_photo: "1", a_tarifer: null, statuts: null, sans_etiquette: null, a_jeter: null })}
              className="carte group border border-slate-200 dark:border-slate-800 bg-white dark:bg-brand-paper !p-4 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between active:scale-[0.98] min-h-[90px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <IconeImage taille={16} /> Sans photo
                </span>
                <span className="text-lg font-black text-brand-black dark:text-white font-outfit">
                  {stats.actions.sans_photo}
                </span>
              </div>
              <div className="text-[11px] text-brand-warm-grey mt-2">Pour vitrine ›</div>
            </button>
          )}
          
          {stats.actions.sans_etiquette > 0 && (
            <button 
              type="button"
              onClick={() => majUrl({ vue: "atraiter", sans_etiquette: "1", a_tarifer: null, statuts: null, sans_photo: null, a_jeter: null })}
              className="carte group border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-brand-paper !p-4 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between active:scale-[0.98] min-h-[90px]"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <IconeEtiquette taille={16} /> À étiqueter
                </span>
                <span className="text-lg font-black text-brand-black dark:text-white font-outfit">
                  {stats.actions.sans_etiquette}
                </span>
              </div>
              <div className="text-[11px] text-brand-warm-grey mt-2">Code-barres ›</div>
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation POS Tactile — 9 Grandes Familles (Niveau 1) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-brand-black dark:text-white font-outfit">
              Catalogue par Grandes Familles
            </h2>
            <p className="text-xs text-brand-warm-grey mt-0.5">
              Sélectionnez une famille pour explorer ses catégories et modèles
            </p>
          </div>
          <button
            type="button"
            onClick={() => majUrl({ vue: "tableau", famille_id: null, categorie_id: null, sous_categorie_id: null })}
            className="btn btn-secondaire text-xs py-1.5 px-3 font-semibold bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 shadow-xs hover:text-brand-orange"
          >
            Voir tout l'inventaire ({stats.summary.total})
          </button>
        </div>
        
        {famillesAffichees.length === 0 && q ? (
          <div className="text-sm text-brand-warm-grey p-8 text-center border border-dashed border-brand-light-grey dark:border-white/10 rounded-2xl bg-white/40 dark:bg-white/5">
            Aucune famille ne correspond à votre recherche « {q} »
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {famillesAffichees.map((famille) => {
              const theme = FAMILLE_THEMES[famille.nom] || THEME_DEFAUT;
              const nonZeroCategories = famille.categories.filter(c => c.total > 0);

              return (
                <div
                  key={famille.id}
                  onClick={() => majUrl({ vue: "famille", famille_id: String(famille.id), categorie_id: null, sous_categorie_id: null })}
                  className={`carte group !p-5 border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-[0.985] min-h-[140px] ${theme.bgSoft}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                        <theme.IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`font-bold text-base sm:text-lg font-outfit text-brand-black dark:text-white leading-snug transition-colors ${theme.textAccent}`}>
                          {famille.nom}
                        </h3>
                        <div className="text-xs text-brand-warm-grey mt-0.5">
                          {nonZeroCategories.length} catégorie{nonZeroCategories.length > 1 ? "s" : ""} · {famille.modelesCount} modèle{famille.modelesCount > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${theme.badgeBg}`}>
                      {famille.total}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-brand-light-grey/40 dark:border-white/5 flex items-center justify-between text-xs text-brand-warm-grey group-hover:text-brand-black dark:group-hover:text-white transition-colors font-medium">
                    <span>Explorer les catégories</span>
                    <div className="w-6 h-6 rounded-full bg-brand-light-grey/30 dark:bg-white/5 flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white transition-colors">
                      <IconeChevronDroite taille={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

