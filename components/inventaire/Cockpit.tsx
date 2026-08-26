import { useEffect, useState } from "react";
import { IconePlus, IconeRecherche } from "@/components/icons";
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
    return <div className="p-4 text-sm text-brand-warm-grey">Chargement du cockpit…</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-entree">
      {/* Résumé */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          className="carte hover-lift cursor-pointer bg-brand-black text-white border-0"
          onClick={() => majUrl({ vue: "tableau", statuts: null })}
        >
          <div className="text-3xl font-extrabold">{stats.summary.total}</div>
          <div className="text-sm font-medium text-brand-light-grey">Produits au total</div>
        </div>
        <div 
          className="carte hover-lift cursor-pointer bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
          onClick={() => majUrl({ vue: "tableau", statuts: "ok,recu" })}
        >
          <div className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-400">{stats.summary.disponibles}</div>
          <div className="text-sm font-medium text-emerald-700 dark:text-emerald-500">Disponibles</div>
        </div>
        <div 
          className="carte hover-lift cursor-pointer bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800/50"
          onClick={() => majUrl({ vue: "tableau", statuts: "en_vente" })}
        >
          <div className="text-3xl font-extrabold text-sky-800 dark:text-sky-400">{stats.summary.en_vente}</div>
          <div className="text-sm font-medium text-sky-700 dark:text-sky-500">En vente</div>
        </div>
      </div>

      {/* Actions à traiter */}
      <div>
        <h2 className="text-lg font-bold text-brand-black dark:text-brand-light-grey mb-3">À traiter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.actions.sans_prix > 0 && (
            <div className="carte flex flex-col justify-between p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/50">
              <div>
                <div className="text-red-800 dark:text-red-400 font-bold text-lg mb-1">Sans prix</div>
                <div className="text-red-700 dark:text-red-300 text-sm mb-3">{stats.actions.sans_prix} produits à tarifer</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", a_tarifer: "1", statuts: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm transition-colors text-sm py-2"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.a_tester > 0 && (
            <div className="carte flex flex-col justify-between p-4 border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/50">
              <div>
                <div className="text-amber-800 dark:text-amber-400 font-bold text-lg mb-1">À tester</div>
                <div className="text-amber-700 dark:text-amber-300 text-sm mb-3">{stats.actions.a_tester} produits en test</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "en_test", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-sm transition-colors text-sm py-2"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.a_reparer > 0 && (
            <div className="carte flex flex-col justify-between p-4 border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800/50">
              <div>
                <div className="text-orange-800 dark:text-orange-400 font-bold text-lg mb-1">À réparer</div>
                <div className="text-orange-700 dark:text-orange-300 text-sm mb-3">{stats.actions.a_reparer} produits en panne</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "a_reparer", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-sm transition-colors text-sm py-2"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.sans_photo > 0 && (
            <div className="carte flex flex-col justify-between p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800/50">
              <div>
                <div className="text-blue-800 dark:text-blue-400 font-bold text-lg mb-1">Sans photo</div>
                <div className="text-blue-700 dark:text-blue-300 text-sm mb-3">{stats.actions.sans_photo} produits sans image</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_photo: "1", a_tarifer: null, statuts: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm transition-colors text-sm py-2"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.sans_etiquette > 0 && (
            <div className="carte flex flex-col justify-between p-4 border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800/50">
              <div>
                <div className="text-purple-800 dark:text-purple-400 font-bold text-lg mb-1">Sans étiquette</div>
                <div className="text-purple-700 dark:text-purple-300 text-sm mb-3">{stats.actions.sans_etiquette} non confirmés</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_etiquette: "1", a_tarifer: null, statuts: null, sans_photo: null, a_jeter: null })}
                className="w-full btn bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-sm transition-colors text-sm py-2"
              >
                Traiter
              </button>
            </div>
          )}
        </div>
        {Object.values(stats.actions).every(v => v === 0) && (
          <div className="flex flex-col items-center justify-center p-8 text-emerald-600 bg-emerald-50 border border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/10 dark:border-emerald-800/30 rounded-xl font-medium">
            <svg className="w-12 h-12 mb-3 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-lg">Parfait !</div>
            <div className="text-sm opacity-80">Aucun produit ne nécessite d'action urgente.</div>
          </div>
        )}
      </div>

      {/* Explorer */}
      <div>
        <h2 className="text-lg font-bold text-brand-black mb-3">Explorer le stock</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => majUrl({ vue: "categorie", categorie: cat.name })}
              className="group relative overflow-hidden rounded-xl border border-brand-light-grey bg-brand-paper hover:border-brand-smooth hover:shadow-lg transition-all text-left flex flex-col"
            >
              <div className="h-28 w-full bg-brand-light-grey/20 relative">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand-warm-grey">
                    {/* Placeholder image icon */}
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <div className="font-bold truncate">{cat.name}</div>
                  <div className="text-xs text-brand-light-grey">{cat.disponibles} disponibles / {cat.total}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
