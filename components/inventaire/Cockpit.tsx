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
          className="carte hover-lift cursor-pointer bg-emerald-50 border-emerald-200"
          onClick={() => majUrl({ vue: "tableau", statuts: "ok,recu" })}
        >
          <div className="text-3xl font-extrabold text-emerald-800">{stats.summary.disponibles}</div>
          <div className="text-sm font-medium text-emerald-700">Disponibles</div>
        </div>
        <div 
          className="carte hover-lift cursor-pointer bg-sky-50 border-sky-200"
          onClick={() => majUrl({ vue: "tableau", statuts: "en_vente" })}
        >
          <div className="text-3xl font-extrabold text-sky-800">{stats.summary.en_vente}</div>
          <div className="text-sm font-medium text-sky-700">En vente</div>
        </div>
      </div>

      {/* Actions à traiter */}
      <div>
        <h2 className="text-lg font-bold text-brand-black mb-3">À traiter</h2>
        <div className="flex flex-wrap gap-3">
          {stats.actions.sans_prix > 0 && (
            <button 
              onClick={() => majUrl({ vue: "atraiter", a_tarifer: "1", statuts: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 transition"
            >
              <div className="text-xl font-bold">{stats.actions.sans_prix}</div>
              <div className="text-sm font-semibold">Sans prix</div>
            </button>
          )}
          {stats.actions.a_tester > 0 && (
            <button 
              onClick={() => majUrl({ vue: "atraiter", statuts: "en_test", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
            >
              <div className="text-xl font-bold">{stats.actions.a_tester}</div>
              <div className="text-sm font-semibold">À tester</div>
            </button>
          )}
          {stats.actions.a_reparer > 0 && (
            <button 
              onClick={() => majUrl({ vue: "atraiter", statuts: "a_reparer", a_tarifer: null, sans_photo: null, sans_etiquette: null, a_jeter: null })}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 transition"
            >
              <div className="text-xl font-bold">{stats.actions.a_reparer}</div>
              <div className="text-sm font-semibold">À réparer</div>
            </button>
          )}
          {stats.actions.sans_photo > 0 && (
            <button 
              onClick={() => majUrl({ vue: "atraiter", sans_photo: "1", a_tarifer: null, statuts: null, sans_etiquette: null, a_jeter: null })}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition"
            >
              <div className="text-xl font-bold">{stats.actions.sans_photo}</div>
              <div className="text-sm font-semibold">Sans photo</div>
            </button>
          )}
          {stats.actions.sans_etiquette > 0 && (
            <button 
              onClick={() => majUrl({ vue: "atraiter", sans_etiquette: "1", a_tarifer: null, statuts: null, sans_photo: null, a_jeter: null })}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 transition"
            >
              <div className="text-xl font-bold">{stats.actions.sans_etiquette}</div>
              <div className="text-sm font-semibold">Sans étiquette</div>
            </button>
          )}

          {Object.values(stats.actions).every(v => v === 0) && (
            <div className="text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 w-full font-medium">
              Aucun produit nécessitant une action urgente.
            </div>
          )}
        </div>
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
