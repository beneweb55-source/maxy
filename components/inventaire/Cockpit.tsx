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

// Thèmes visuels pour les 9 Grandes Familles
const FAMILLE_THEMES: Record<string, { gradient: string; icon: string; border: string; badge: string; textAccent: string }> = {
  "ORDINATEURS": {
    gradient: "from-blue-600 to-indigo-800 dark:from-blue-900/80 dark:to-indigo-950/90",
    icon: "💻",
    border: "border-blue-500/30 hover:border-blue-500",
    badge: "bg-blue-500/20 text-blue-200 border-blue-400/30",
    textAccent: "text-blue-400",
  },
  "STOCKAGE": {
    gradient: "from-cyan-600 to-teal-800 dark:from-cyan-900/80 dark:to-teal-950/90",
    icon: "💾",
    border: "border-cyan-500/30 hover:border-cyan-500",
    badge: "bg-cyan-500/20 text-cyan-200 border-cyan-400/30",
    textAccent: "text-cyan-400",
  },
  "SERVEURS & BAIES": {
    gradient: "from-purple-600 to-slate-900 dark:from-purple-950/80 dark:to-slate-950/90",
    icon: "🖥️",
    border: "border-purple-500/30 hover:border-purple-500",
    badge: "bg-purple-500/20 text-purple-200 border-purple-400/30",
    textAccent: "text-purple-400",
  },
  "ÉLECTRICITÉ & CONNECTIQUE": {
    gradient: "from-amber-600 to-orange-800 dark:from-amber-900/80 dark:to-orange-950/90",
    icon: "⚡",
    border: "border-amber-500/30 hover:border-amber-500",
    badge: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    textAccent: "text-amber-400",
  },
  "MÉMOIRE & PROCESSEURS": {
    gradient: "from-emerald-600 to-teal-900 dark:from-emerald-950/80 dark:to-teal-950/90",
    icon: "🧠",
    border: "border-emerald-500/30 hover:border-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    textAccent: "text-emerald-400",
  },
  "IMPRESSION & CONSOMMABLES": {
    gradient: "from-rose-600 to-pink-800 dark:from-rose-950/80 dark:to-pink-950/90",
    icon: "🖨️",
    border: "border-rose-500/30 hover:border-rose-500",
    badge: "bg-rose-500/20 text-rose-200 border-rose-400/30",
    textAccent: "text-rose-400",
  },
  "ÉCRANS & PÉRIPHÉRIQUES": {
    gradient: "from-sky-600 to-blue-900 dark:from-sky-950/80 dark:to-blue-950/90",
    icon: "🖥️",
    border: "border-sky-500/30 hover:border-sky-500",
    badge: "bg-sky-500/20 text-sky-200 border-sky-400/30",
    textAccent: "text-sky-400",
  },
  "COMPOSANTS & CARTES D'EXTENSION": {
    gradient: "from-violet-600 to-purple-900 dark:from-violet-950/80 dark:to-purple-950/90",
    icon: "🔌",
    border: "border-violet-500/30 hover:border-violet-500",
    badge: "bg-violet-500/20 text-violet-200 border-violet-400/30",
    textAccent: "text-violet-400",
  },
  "RÉSEAU ACTIF & COMMUTATION": {
    gradient: "from-emerald-700 to-green-950 dark:from-emerald-950 dark:to-green-950",
    icon: "🌐",
    border: "border-emerald-500/30 hover:border-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    textAccent: "text-emerald-400",
  },
};

const THEME_DEFAUT = {
  gradient: "from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950",
  icon: "📦",
  border: "border-slate-500/30 hover:border-slate-400",
  badge: "bg-slate-500/20 text-slate-200 border-slate-400/30",
  textAccent: "text-slate-300",
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
  const [familleDepliee, setFamilleDepliee] = useState<number | null>(null);

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
          <div className="h-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
        </div>
        <div className="h-6 w-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-md mt-10 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-44 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-44 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-44 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
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

  const famillesAffichees = (stats.familles || []).filter((f) => {
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
    <div className="space-y-10 animate-entree pb-8">
      {/* 1. Résumé Global du Stock (KPIs) */}
      <div>
        <h2 className="text-xl font-bold text-brand-black dark:text-white mb-4 font-outfit">
          Aperçu du stock
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="carte relative overflow-hidden group cursor-pointer bg-gradient-to-br from-brand-black to-brand-smooth dark:from-brand-white dark:to-brand-paper border-0 !p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]"
            onClick={() => majUrl({ vue: "tableau", statuts: null, famille_id: null, categorie_id: null, sous_categorie_id: null })}
          >
            <div className="absolute -right-4 -top-4 text-white/5 dark:text-brand-light-grey/20 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
              <IconeArchive taille={110} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-3">
              <div className="flex items-center gap-3 text-brand-grey dark:text-brand-grey">
                <IconeArchive taille={22} className="text-white/70 dark:text-white/50" />
                <span className="text-sm font-semibold tracking-wider uppercase text-white/90 dark:text-brand-warm-grey">
                  Stock Actif Total
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white dark:text-white font-outfit tracking-tight">
                {stats.summary.total}
              </div>
              <div className="text-xs text-white/60 dark:text-white/40 flex items-center gap-1 font-medium">
                <span>Tous articles physiques en rayon & réserve</span>
              </div>
            </div>
          </div>

          <div 
            className="carte relative overflow-hidden group cursor-pointer border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 dark:from-emerald-950/40 dark:to-brand-paper dark:border-emerald-900/50 !p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]"
            onClick={() => majUrl({ vue: "tableau", statuts: "ok,recu,en_test,en_vente", famille_id: null, categorie_id: null, sous_categorie_id: null })}
          >
            <div className="absolute -right-4 -top-4 text-emerald-500/10 dark:text-emerald-500/10 transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
              <IconeCocheCercle taille={110} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-3">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <IconeCocheCercle taille={22} />
                <span className="text-sm font-semibold tracking-wider uppercase">
                  Disponibles & Sains
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-emerald-900 dark:text-emerald-400 font-outfit tracking-tight">
                {stats.summary.disponibles}
              </div>
              <div className="text-xs text-emerald-700/70 dark:text-emerald-400/60 flex items-center gap-1 font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span>Prêts pour la vente ou attribution</span>
              </div>
            </div>
          </div>

          <div 
            className="carte relative overflow-hidden group cursor-pointer border border-brand-light-orange bg-gradient-to-br from-brand-glow via-white to-amber-50/20 dark:from-brand-orange/20 dark:to-brand-paper dark:border-brand-orange/30 !p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]"
            onClick={() => majUrl({ vue: "tableau", statuts: "en_vente", famille_id: null, categorie_id: null, sous_categorie_id: null })}
          >
            <div className="absolute -right-4 -top-4 text-brand-orange/10 dark:text-brand-orange/10 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
              <IconePanier taille={110} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-3">
              <div className="flex items-center gap-3 text-brand-orange">
                <IconePanier taille={22} />
                <span className="text-sm font-semibold tracking-wider uppercase">
                  En Vente / Vitrine
                </span>
              </div>
              <div className="text-4xl sm:text-5xl font-black text-brand-orange dark:text-brand-light-orange font-outfit tracking-tight">
                {stats.summary.en_vente}
              </div>
              <div className="text-xs text-brand-orange/80 dark:text-brand-light-orange/70 flex items-center gap-1 font-medium">
                <span>Exposés au public et en boutique</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Actions Prioritaires à Traiter */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-brand-black dark:text-white font-outfit">
            À traiter en priorité
          </h2>
          {Object.values(stats.actions).some((v) => v > 0) && (
            <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              Attention requise
            </span>
          )}
        </div>
        
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-4 sm:pb-0 snap-x hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {stats.actions.sans_prix > 0 && (
            <div className="min-w-[240px] sm:min-w-0 snap-center shrink-0 carte group border border-red-200 dark:border-red-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
              <div className="mb-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                  <IconeAlerte taille={18} />
                  <span className="font-bold text-sm">Sans prix</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">
                  {stats.actions.sans_prix}
                </div>
                <div className="text-xs text-brand-warm-grey">Tarifs à fixer</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", a_tarifer: "1", statuts: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800/50 text-xs font-bold py-2"
              >
                Traiter ({stats.actions.sans_prix})
              </button>
            </div>
          )}
          
          {stats.actions.a_tester > 0 && (
            <div className="min-w-[240px] sm:min-w-0 snap-center shrink-0 carte group border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
              <div className="mb-4">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                  <IconeMinuteur taille={18} />
                  <span className="font-bold text-sm">À tester</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">
                  {stats.actions.a_tester}
                </div>
                <div className="text-xs text-brand-warm-grey">En attente de banc d'essai</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "en_test", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 text-xs font-bold py-2"
              >
                Tester ({stats.actions.a_tester})
              </button>
            </div>
          )}
          
          {stats.actions.a_reparer > 0 && (
            <div className="min-w-[240px] sm:min-w-0 snap-center shrink-0 carte group border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
              <div className="mb-4">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                  <IconeCle taille={18} />
                  <span className="font-bold text-sm">À réparer</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">
                  {stats.actions.a_reparer}
                </div>
                <div className="text-xs text-brand-warm-grey">En attente de pièces ou maintenance</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "a_reparer", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 text-xs font-bold py-2"
              >
                Réparer ({stats.actions.a_reparer})
              </button>
            </div>
          )}
          
          {stats.actions.sans_photo > 0 && (
            <div className="min-w-[240px] sm:min-w-0 snap-center shrink-0 carte group border border-slate-200 dark:border-slate-800/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-400"></div>
              <div className="mb-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-2">
                  <IconeImage taille={18} />
                  <span className="font-bold text-sm">Sans photo</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">
                  {stats.actions.sans_photo}
                </div>
                <div className="text-xs text-brand-warm-grey">Photos pour vitrine & vente</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_photo: "1", a_tarifer: null, statuts: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800/30 dark:hover:bg-slate-800/50 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50 text-xs font-bold py-2"
              >
                Photographier ({stats.actions.sans_photo})
              </button>
            </div>
          )}
          
          {stats.actions.sans_etiquette > 0 && (
            <div className="min-w-[240px] sm:min-w-0 snap-center shrink-0 carte group border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-zinc-400"></div>
              <div className="mb-4">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 mb-2">
                  <IconeEtiquette taille={18} />
                  <span className="font-bold text-sm">À étiqueter</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">
                  {stats.actions.sans_etiquette}
                </div>
                <div className="text-xs text-brand-warm-grey">Codes-barres à imprimer</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_etiquette: "1", a_tarifer: null, statuts: null, sans_photo: null, a_jeter: null })}
                className="w-full btn bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/50 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/50 text-xs font-bold py-2"
              >
                Étiqueter ({stats.actions.sans_etiquette})
              </button>
            </div>
          )}
        </div>
        
        {Object.values(stats.actions).every((v) => v === 0) && (
          <div className="flex flex-col items-center justify-center p-8 text-emerald-600 bg-emerald-50 border border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/10 dark:border-emerald-800/30 rounded-2xl font-medium shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-3">
              <IconeCocheCercle taille={28} />
            </div>
            <div className="text-lg font-bold font-outfit mb-0.5 text-brand-black dark:text-white">
              Tout est à jour !
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-500">
              Aucun produit ne nécessite d'action urgente en attente.
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation par Grandes Familles (Architecture Matérielle) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-black dark:text-white font-outfit">
              Catalogue par Grandes Familles ({famillesAffichees.length})
            </h2>
            <p className="text-xs text-brand-warm-grey mt-0.5">
              Sélectionnez une famille pour explorer ses catégories et matériels
            </p>
          </div>
          <div className="flex items-center bg-brand-light-grey/20 dark:bg-white/5 p-1 rounded-xl border border-brand-light-grey/50 dark:border-white/10 shrink-0">
            <button
              onClick={() => setAfficherFamilles(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                afficherFamilles 
                  ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" 
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              Vue Familles & Arborescence
            </button>
            <button
              onClick={() => setAfficherFamilles(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !afficherFamilles 
                  ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" 
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              Vue Liste Directe
            </button>
          </div>
        </div>
        
        {afficherFamilles && (
          famillesAffichees.length === 0 && q ? (
            <div className="text-sm text-brand-warm-grey p-8 text-center border border-dashed border-brand-light-grey dark:border-white/10 rounded-2xl bg-white/40 dark:bg-white/5">
              Aucune famille ne correspond à votre recherche « {q} »
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {famillesAffichees.map((famille) => {
                const theme = FAMILLE_THEMES[famille.nom] || THEME_DEFAUT;
                const estDepliee = familleDepliee === famille.id;

                return (
                  <div
                    key={famille.id}
                    className={`carte !p-0 border overflow-hidden rounded-2xl transition-all duration-300 flex flex-col bg-white dark:bg-brand-paper shadow-sm hover:shadow-lg ${
                      estDepliee ? "ring-2 ring-brand-orange border-brand-orange" : theme.border
                    }`}
                  >
                    {/* Header de la carte Famille */}
                    <div 
                      className={`p-5 bg-gradient-to-br ${theme.gradient} text-white cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px]`}
                      onClick={() => setFamilleDepliee(estDepliee ? null : famille.id)}
                    >
                      <div className="absolute -right-3 -bottom-3 text-6xl opacity-15 select-none pointer-events-none">
                        {theme.icon}
                      </div>

                      <div className="flex items-start justify-between gap-3 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl drop-shadow-sm">{theme.icon}</span>
                          <div>
                            <h3 className="font-extrabold text-lg sm:text-xl font-outfit tracking-tight leading-tight">
                              {famille.nom}
                            </h3>
                            <div className="text-xs text-white/80 mt-0.5">
                              {famille.categories.length} catégorie{famille.categories.length > 1 ? "s" : ""} · {famille.modelesCount} modèles
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border backdrop-blur-md shadow-sm ${theme.badge}`}>
                          {famille.total} unités
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between relative z-10 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            majUrl({ vue: "tableau", famille_id: String(famille.id), categorie_id: null, sous_categorie_id: null });
                          }}
                          className="hover:underline flex items-center gap-1 text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Voir les {famille.total} produits <IconeChevronDroite taille={13} />
                        </button>
                        
                        <div className="flex items-center gap-1 text-white/90">
                          <span>{estDepliee ? "Masquer sous-arbo" : "Explorer"}</span>
                          <IconeChevronBas taille={14} className={`transition-transform duration-300 ${estDepliee ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                    </div>

                    {/* Liste des catégories & sous-catégories (accordéon tactile) */}
                    {estDepliee && (
                      <div className="p-4 space-y-3 bg-brand-light-grey/10 dark:bg-black/20 animate-entree border-t border-brand-light-grey/30 dark:border-white/5">
                        {famille.categories.map((cat) => (
                          <div 
                            key={cat.id} 
                            className="bg-white dark:bg-brand-paper/80 rounded-xl p-3 border border-brand-light-grey/60 dark:border-white/10 shadow-xs space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => majUrl({ vue: "tableau", categorie_id: String(cat.id), famille_id: null, sous_categorie_id: null })}
                                className="font-bold text-sm text-brand-black dark:text-white hover:text-brand-orange transition-colors text-left flex items-center gap-1.5"
                              >
                                <span className="w-2 h-2 rounded-full bg-brand-orange"></span>
                                {cat.nom}
                              </button>
                              <span className="bg-brand-light-grey/40 dark:bg-white/10 text-brand-black dark:text-white text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0">
                                {cat.total}
                              </span>
                            </div>

                            {/* Sous-catégories (Chips tactiles) */}
                            {cat.sousCategories.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pl-3 border-l-2 border-brand-orange/30">
                                {cat.sousCategories.map((sc) => (
                                  <button
                                    key={sc.id}
                                    type="button"
                                    onClick={() => majUrl({ vue: "tableau", sous_categorie_id: String(sc.id), famille_id: null, categorie_id: null })}
                                    className="bg-brand-light-grey/25 hover:bg-brand-orange/10 dark:bg-white/5 dark:hover:bg-brand-orange/20 border border-brand-light-grey/50 dark:border-white/10 hover:border-brand-orange/50 text-xs px-2 py-1 rounded-md text-brand-warm-grey dark:text-brand-grey hover:text-brand-orange transition-all flex items-center gap-1.5"
                                  >
                                    <span>{sc.nom}</span>
                                    <span className="text-[10px] font-bold opacity-75">({sc.total})</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

