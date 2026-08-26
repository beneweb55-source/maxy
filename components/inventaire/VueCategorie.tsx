import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RechercheRapide from "@/components/RechercheRapide";
import { IconeChevronGauche } from "@/components/icons";
import { formaterDA } from "@/lib/caisse";

interface Famille {
  cle: string;
  reference: string;
  categorie: string;
  image_url: string | null;
  nbImages: number;
  unites: number;
  disponibles: number;
  a_tester: number;
  prixMin: number;
  prixMax: number;
  venteMin: number | null;
  venteMax: number | null;
}

interface FamillesData {
  total: number;
  pages: number;
  page: number;
  familles: Famille[];
}

export default function VueCategorie({
  categorie,
  majUrl
}: {
  categorie: string;
  majUrl: (modifs: Record<string, string | null>) => void;
}) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<FamillesData | null>(null);
  const [loading, setLoading] = useState(true);
  const q = searchParams?.get("q") ?? "";

  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setErreur(null);
    const params = new URLSearchParams(searchParams?.toString() || "");
    // Ensure we are fetching for the right category
    params.set("categorie", categorie); 
    
    fetch(`/api/produits/familles?${params.toString()}`, { signal })
      .then(async r => {
        if (!r.ok) throw new Error("Erreur lors du chargement des catégories");
        return r.json();
      })
      .then(d => { 
        if (signal.aborted) return;
        setData(d); 
        setLoading(false); 
      })
      .catch(e => { 
        if (e.name === "AbortError") return;
        console.error(e); 
        setErreur(e.message || "Erreur réseau");
        setLoading(false); 
      });

    return () => controller.abort();
  }, [searchParams, categorie]);

  return (
    <div className="space-y-6 animate-entree">
      {/* En-tête Navigation (Breadcrumb) */}
      <div className="flex items-center gap-2 text-sm text-brand-warm-grey font-medium pb-2 border-b border-brand-light-grey/50">
        <button
          onClick={() => majUrl({ vue: "cockpit", categorie: null, cle: null })}
          className="hover:text-brand-orange transition-colors flex items-center gap-1 bg-white dark:bg-brand-paper px-2 py-1 rounded-md border border-brand-light-grey dark:border-white/10 shadow-sm"
          title="Retour au Cockpit"
        >
          <IconeChevronGauche taille={14} /> Cockpit
        </button>
        <span>/</span>
        <span className="font-bold text-brand-black dark:text-white font-outfit text-lg">
          {categorie}
        </span>
        {data && (
          <span className="bg-brand-light-grey/30 dark:bg-white/10 text-brand-black dark:text-white px-2 py-0.5 rounded-full text-xs font-bold ml-2">
            {data.total} familles
          </span>
        )}
      </div>



      {/* Liste des familles */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="carte p-4 border border-brand-light-grey dark:border-white/5 h-[160px] flex flex-col">
              <div className="flex gap-4 mb-3">
                <div className="h-16 w-16 rounded-lg bg-brand-light-grey/30 dark:bg-white/5 flex-shrink-0"></div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-5 bg-brand-light-grey/30 dark:bg-white/5 rounded-md w-3/4"></div>
                  <div className="h-4 bg-brand-light-grey/20 dark:bg-white/5 rounded-md w-1/2"></div>
                </div>
              </div>
              <div className="mt-auto grid grid-cols-3 gap-2 border-t border-brand-light-grey/30 dark:border-white/5 pt-3">
                <div className="h-8 bg-brand-light-grey/20 dark:bg-white/5 rounded-md"></div>
                <div className="h-8 bg-brand-light-grey/20 dark:bg-white/5 rounded-md"></div>
                <div className="h-8 bg-brand-light-grey/20 dark:bg-white/5 rounded-md"></div>
              </div>
            </div>
          ))}
        </div>
      ) : erreur ? (
        <div className="carte flex flex-col items-center justify-center p-12 text-danger">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-lg font-bold font-outfit mb-1">Une erreur est survenue</div>
          <div className="text-sm">{erreur}</div>
        </div>
      ) : data?.familles.length === 0 ? (
        <div className="carte flex flex-col items-center justify-center p-12 text-brand-warm-grey">
          <div className="w-16 h-16 bg-brand-light-grey/20 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div className="text-lg font-bold font-outfit text-brand-black dark:text-white mb-1">Aucun produit trouvé</div>
          <div className="text-sm">Essayez de modifier votre recherche ou ajoutez de nouveaux produits.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.familles.map(f => (
            <button
              key={f.cle}
              onClick={() => majUrl({ vue: "famille", cle: f.cle })}
              className="carte group text-left flex flex-col h-full border border-brand-light-grey dark:border-white/10 hover:border-brand-smooth hover:shadow-xl transition-all !p-0 overflow-hidden bg-white dark:bg-brand-paper relative"
            >
              <div className="p-4 flex gap-4 mb-2 z-10 relative">
                <div className="h-20 w-20 rounded-xl bg-brand-light-grey/20 dark:bg-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden border border-brand-light-grey/50 dark:border-white/10 group-hover:scale-105 transition-transform shadow-sm">
                  {f.image_url ? (
                    <img src={f.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-brand-warm-grey text-[10px] uppercase font-bold opacity-60">Sans image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-bold text-brand-black dark:text-white font-outfit text-lg leading-tight truncate-2-lines mb-1.5 group-hover:text-brand-orange transition-colors">
                    {f.reference || "Sans référence"}
                  </h3>
                  <div className="text-sm font-extrabold text-brand-orange">
                    {f.venteMin === f.venteMax && f.venteMin !== null
                      ? `${formaterDA(f.venteMin)}`
                      : f.venteMin !== null
                        ? `${formaterDA(f.venteMin)} - ${formaterDA(f.venteMax!)}`
                        : "Non tarifé"}
                  </div>
                </div>
              </div>
              
              <div className="mt-auto grid grid-cols-3 gap-px bg-brand-light-grey/30 dark:bg-white/10 z-10 relative">
                <div className="text-center py-2.5 bg-white dark:bg-brand-paper group-hover:bg-brand-light-grey/10 transition-colors">
                  <div className="text-sm font-bold text-brand-black dark:text-white">{f.unites}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-brand-warm-grey">Total</div>
                </div>
                <div className="text-center py-2.5 bg-emerald-50 dark:bg-emerald-900/10 group-hover:bg-emerald-100/50 transition-colors">
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{f.disponibles}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70">Dispo</div>
                </div>
                <div className={`text-center py-2.5 transition-colors ${f.a_tester > 0 ? 'bg-amber-50 dark:bg-amber-900/10 group-hover:bg-amber-100/50' : 'bg-white dark:bg-brand-paper group-hover:bg-brand-light-grey/10'}`}>
                  <div className={`text-sm font-bold ${f.a_tester > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-brand-warm-grey'}`}>{f.a_tester}</div>
                  <div className={`text-[9px] font-bold uppercase tracking-wider ${f.a_tester > 0 ? 'text-amber-600/70 dark:text-amber-500/70' : 'text-brand-warm-grey/50'}`}>À tester</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
