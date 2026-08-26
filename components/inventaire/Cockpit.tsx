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
          className="carte cursor-pointer hover:bg-[var(--bg-surface-hover)] border-l-4 border-l-brand-black dark:border-l-white"
          onClick={() => majUrl({ vue: "tableau", statuts: null })}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">Produits au total</div>
          <div className="text-3xl font-extrabold text-brand-black">{stats.summary.total}</div>
        </div>
        <div 
          className="carte cursor-pointer hover:bg-[var(--bg-surface-hover)] border-l-4 border-l-succes"
          onClick={() => majUrl({ vue: "tableau", statuts: "ok,recu" })}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">Disponibles</div>
          <div className="text-3xl font-extrabold text-brand-black">{stats.summary.disponibles}</div>
        </div>
        <div 
          className="carte cursor-pointer hover:bg-[var(--bg-surface-hover)] border-l-4 border-l-info"
          onClick={() => majUrl({ vue: "tableau", statuts: "en_vente" })}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">En vente</div>
          <div className="text-3xl font-extrabold text-brand-black">{stats.summary.en_vente}</div>
        </div>
      </div>

      {/* Actions à traiter */}
      <div>
        <h2 className="text-sm font-bold text-brand-black tracking-wide uppercase mb-4 opacity-80">À traiter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.actions.sans_prix > 0 && (
            <div className="carte flex flex-col justify-between p-4 gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-danger" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">Sans prix</div>
                <div className="text-2xl font-bold text-brand-black">{stats.actions.sans_prix}</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", a_tarifer: "1", statuts: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn btn-secondaire text-xs py-1.5"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.a_tester > 0 && (
            <div className="carte flex flex-col justify-between p-4 gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-attention" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">À tester</div>
                <div className="text-2xl font-bold text-brand-black">{stats.actions.a_tester}</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "en_test", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn btn-secondaire text-xs py-1.5"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.a_reparer > 0 && (
            <div className="carte flex flex-col justify-between p-4 gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-orange" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">À réparer</div>
                <div className="text-2xl font-bold text-brand-black">{stats.actions.a_reparer}</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", statuts: "a_reparer", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn btn-secondaire text-xs py-1.5"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.sans_photo > 0 && (
            <div className="carte flex flex-col justify-between p-4 gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-info" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">Sans photo</div>
                <div className="text-2xl font-bold text-brand-black">{stats.actions.sans_photo}</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_photo: "1", a_tarifer: null, statuts: null, sans_etiquette: null, a_jeter: null })}
                className="w-full btn btn-secondaire text-xs py-1.5"
              >
                Traiter
              </button>
            </div>
          )}
          {stats.actions.sans_etiquette > 0 && (
            <div className="carte flex flex-col justify-between p-4 gap-3 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-smooth" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand-warm-grey mb-1">Sans étiquette</div>
                <div className="text-2xl font-bold text-brand-black">{stats.actions.sans_etiquette}</div>
              </div>
              <button 
                onClick={() => majUrl({ vue: "atraiter", sans_etiquette: "1", a_tarifer: null, statuts: null, sans_photo: null, a_jeter: null })}
                className="w-full btn btn-secondaire text-xs py-1.5"
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
        <h2 className="text-sm font-bold text-brand-black tracking-wide uppercase mb-4 opacity-80">Explorer le stock</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {stats.categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => majUrl({ vue: "categorie", categorie: cat.name })}
              className="carte p-0 group overflow-hidden transition-all text-left flex flex-col hover:-translate-y-1"
            >
              <div className="h-28 w-full relative bg-[var(--bg-surface-secondary)] border-b border-[var(--border-color)] flex items-center justify-center">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-opacity" />
                ) : (
                  <svg className="w-8 h-8 text-[var(--border-color)] group-hover:text-brand-grey transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm text-brand-black truncate">{cat.name}</div>
                <div className="text-xs text-brand-warm-grey mt-0.5">{cat.disponibles} disponibles / {cat.total}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
