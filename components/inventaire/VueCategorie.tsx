import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RechercheRapide from "@/components/RechercheRapide";
import { IconeChevronGauche } from "@/components/icons";

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

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(searchParams?.toString() || "");
    // Ensure we are fetching for the right category
    params.set("categorie", categorie); 
    fetch(`/api/produits/familles?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, [searchParams, categorie]);

  return (
    <div className="space-y-6 animate-entree">
      {/* En-tête Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => majUrl({ vue: null, categorie: null })}
          className="btn btn-secondaire px-2"
          title="Retour au Cockpit"
        >
          <IconeChevronGauche taille={16} />
        </button>
        <h2 className="text-2xl font-bold text-brand-black">
          {categorie}
        </h2>
        {data && (
          <span className="text-sm font-medium text-brand-warm-grey">
            {data.total} familles
          </span>
        )}
      </div>

      {/* Barre de recherche localisée */}
      <div className="carte p-4">
        <RechercheRapide
          valeur={q}
          onChange={(valeur) => majUrl({ q: valeur.trim() || null, page: "1" })}
          placeholder={`Rechercher dans ${categorie}...`}
          debounceMs={300}
        />
      </div>

      {/* Liste des familles */}
      {loading ? (
        <div className="text-sm text-brand-warm-grey">Chargement des familles...</div>
      ) : data?.familles.length === 0 ? (
        <div className="carte text-center p-8 text-brand-warm-grey">
          Aucun produit trouvé dans cette catégorie.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.familles.map(f => (
            <button
              key={f.cle}
              onClick={() => majUrl({ vue: "famille", cle: f.cle })}
              className="carte hover-lift text-left flex flex-col h-full border border-brand-light-grey hover:border-brand-smooth hover:shadow-md transition-all p-4"
            >
              <div className="flex gap-4 mb-3">
                <div className="h-16 w-16 rounded-md bg-brand-light-grey/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-brand-light-grey/50">
                  {f.image_url ? (
                    <img src={f.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-brand-warm-grey text-xs">Sans photo</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-brand-black leading-tight truncate-2-lines mb-1">
                    {f.reference || "Sans référence"}
                  </h3>
                  <div className="text-xs font-semibold text-brand-orange">
                    {f.venteMin === f.venteMax && f.venteMin !== null
                      ? `${f.venteMin} DA`
                      : f.venteMin !== null
                        ? `${f.venteMin} - ${f.venteMax} DA`
                        : "Non tarifé"}
                  </div>
                </div>
              </div>
              
              <div className="mt-auto grid grid-cols-3 gap-2 border-t border-brand-light-grey/50 pt-3">
                <div className="text-center">
                  <div className="text-sm font-bold text-brand-black">{f.unites}</div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-warm-grey">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-emerald-600">{f.disponibles}</div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-warm-grey">Dispo</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-amber-600">{f.a_tester}</div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-warm-grey">À tester</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
