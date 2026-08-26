import { useEffect, useState } from "react";
import { IconePlus, IconeRecherche, IconeArchive, IconeCocheCercle, IconePanier, IconeImage, IconeAlerte, IconeEtiquette, IconeCle, IconeMinuteur } from "@/components/icons";
import { useT } from "@/lib/i18n/contexte";

interface StatsData {
  summary: { total: number; disponibles: number; en_vente: number; };
  actions: { sans_prix: number; a_tester: number; a_reparer: number; sans_photo: number; sans_etiquette: number; };
  categories: { name: string; total: number; disponibles: number; image: string | null }[];
}

export default function Cockpit({ majUrl }: { majUrl: (modifs: Record<string, string | null>) => void }) {
  const t = useT();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/produits/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="h-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
        </div>
        <div className="h-6 w-32 bg-brand-light-grey/30 dark:bg-white/5 rounded-md mt-10 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="h-40 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-40 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-10 animate-entree pb-8">
      {/* Résumé */}
      <div>
        <h2 className="text-xl font-bold text-brand-black dark:text-brand-light-grey mb-4 font-outfit">Aperçu du stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="carte relative overflow-hidden group cursor-pointer bg-gradient-to-br from-brand-black to-brand-smooth border-0 !p-6"
            onClick={() => majUrl({ vue: "tableau", statuts: null })}
          >
            <div className="absolute -right-6 -top-6 text-white/5 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
              <IconeArchive taille={120} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex items-center gap-3 text-brand-grey">
                <IconeArchive taille={20} className="text-white/70" />
                <span className="text-sm font-semibold tracking-wide uppercase">Produits au total</span>
              </div>
              <div className="text-5xl font-extrabold text-white font-outfit">{stats.summary.total}</div>
            </div>
          </div>

          <div 
            className="carte relative overflow-hidden group cursor-pointer border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-brand-paper dark:border-emerald-900/50 !p-6"
            onClick={() => majUrl({ vue: "tableau", statuts: "ok,recu" })}
          >
            <div className="absolute -right-6 -top-6 text-emerald-500/5 dark:text-emerald-500/10 transform group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
              <IconeCocheCercle taille={120} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-500">
                <IconeCocheCercle taille={20} />
                <span className="text-sm font-semibold tracking-wide uppercase">Disponibles</span>
              </div>
              <div className="text-5xl font-extrabold text-emerald-900 dark:text-emerald-400 font-outfit">{stats.summary.disponibles}</div>
            </div>
          </div>

          <div 
            className="carte relative overflow-hidden group cursor-pointer border border-brand-light-orange bg-gradient-to-br from-brand-glow to-white dark:from-brand-orange/20 dark:to-brand-paper dark:border-brand-orange/30 !p-6"
            onClick={() => majUrl({ vue: "tableau", statuts: "en_vente" })}
          >
            <div className="absolute -right-6 -top-6 text-brand-orange/5 dark:text-brand-orange/10 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
              <IconePanier taille={120} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex items-center gap-3 text-brand-orange">
                <IconePanier taille={20} />
                <span className="text-sm font-semibold tracking-wide uppercase">En vente</span>
              </div>
              <div className="text-5xl font-extrabold text-brand-orange dark:text-brand-light-orange font-outfit">{stats.summary.en_vente}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions à traiter */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold text-brand-black dark:text-brand-light-grey font-outfit">À traiter</h2>
          {Object.values(stats.actions).some(v => v > 0) && (
            <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
              Priorité
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.actions.sans_prix > 0 && (
            <div className="carte group border border-red-200 dark:border-red-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                  <IconeAlerte taille={18} />
                  <span className="font-bold">Sans prix</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">{stats.actions.sans_prix}</div>
                <div className="text-sm text-brand-warm-grey">Produits à tarifer</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", a_tarifer: "1", statuts: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 border border-red-200 dark:border-red-800/50 shadow-none"
              >
                Traiter
              </button>
            </div>
          )}
          
          {stats.actions.a_tester > 0 && (
            <div className="carte group border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                  <IconeMinuteur taille={18} />
                  <span className="font-bold">À tester</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">{stats.actions.a_tester}</div>
                <div className="text-sm text-brand-warm-grey">En attente de test</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "en_test", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shadow-none"
              >
                Traiter
              </button>
            </div>
          )}
          
          {stats.actions.a_reparer > 0 && (
            <div className="carte group border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                  <IconeCle taille={18} />
                  <span className="font-bold">À réparer</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">{stats.actions.a_reparer}</div>
                <div className="text-sm text-brand-warm-grey">Produits en panne</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "a_reparer", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 shadow-none"
              >
                Traiter
              </button>
            </div>
          )}
          
          {stats.actions.sans_photo > 0 && (
            <div className="carte group border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                  <IconeImage taille={18} />
                  <span className="font-bold">Sans photo</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">{stats.actions.sans_photo}</div>
                <div className="text-sm text-brand-warm-grey">Pour la vitrine</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_photo: "1", a_tarifer: null, statuts: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shadow-none"
              >
                Traiter
              </button>
            </div>
          )}
          
          {stats.actions.sans_etiquette > 0 && (
            <div className="carte group border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-brand-paper !p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                  <IconeEtiquette taille={18} />
                  <span className="font-bold">À étiqueter</span>
                </div>
                <div className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-1">{stats.actions.sans_etiquette}</div>
                <div className="text-sm text-brand-warm-grey">Non confirmés</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_etiquette: "1", a_tarifer: null, statuts: null, sans_photo: null, a_jeter: null })}
                className="w-full btn bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 shadow-none"
              >
                Traiter
              </button>
            </div>
          )}
        </div>
        
        {Object.values(stats.actions).every(v => v === 0) && (
          <div className="flex flex-col items-center justify-center p-12 text-emerald-600 bg-emerald-50 border border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/10 dark:border-emerald-800/30 rounded-2xl font-medium shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-4">
              <IconeCocheCercle taille={32} />
            </div>
            <div className="text-xl font-bold font-outfit mb-1 text-brand-black dark:text-white">Tout est à jour !</div>
            <div className="text-sm text-emerald-700 dark:text-emerald-500">Aucun produit ne nécessite d'action urgente.</div>
          </div>
        )}
      </div>

      {/* Explorer */}
      <div>
        <h2 className="text-xl font-bold text-brand-black dark:text-brand-light-grey mb-4 font-outfit">Explorer par catégorie</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {stats.categories.map((cat, i) => {
            // Un petit tableau de couleurs pour les fallbacks (sans image)
            const fallbackColors = [
              "from-blue-500/80 to-blue-700/90 dark:from-blue-900/60 dark:to-blue-950/80",
              "from-emerald-500/80 to-emerald-700/90 dark:from-emerald-900/60 dark:to-emerald-950/80",
              "from-violet-500/80 to-violet-700/90 dark:from-violet-900/60 dark:to-violet-950/80",
              "from-amber-500/80 to-amber-700/90 dark:from-amber-900/60 dark:to-amber-950/80",
              "from-rose-500/80 to-rose-700/90 dark:from-rose-900/60 dark:to-rose-950/80"
            ];
            const colorClass = fallbackColors[i % fallbackColors.length];

            return (
              <button
                key={cat.name}
                onClick={() => majUrl({ vue: "categorie", categorie: cat.name })}
                className="carte group relative overflow-hidden !p-0 border border-brand-light-grey dark:border-white/10 hover:border-brand-orange/50 hover:shadow-xl transition-all text-left flex flex-col rounded-2xl"
              >
                <div className={`h-36 w-full relative overflow-hidden ${cat.image ? 'bg-brand-black' : 'bg-gradient-to-br ' + colorClass}`}>
                  {cat.image && (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-700 ease-out" />
                  )}
                  {/* Dégradé pour lisibilité du texte (toujours présent si image) */}
                  {cat.image && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                  )}
                  
                  {/* Contenu textuel */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white flex flex-col justify-end">
                    <div className="font-extrabold text-base sm:text-lg font-outfit leading-tight mb-2 drop-shadow-md group-hover:text-brand-orange transition-colors line-clamp-2">
                      {cat.name}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-auto">
                      <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-white shadow-sm flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        {cat.disponibles} <span className="opacity-70 font-medium">dispos</span>
                      </div>
                      
                      <div className="bg-black/30 backdrop-blur-md px-2 py-1 rounded-md text-xs font-medium text-white/80 shadow-sm ml-auto">
                        {cat.total} <span className="opacity-70 text-[10px] uppercase">total</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
