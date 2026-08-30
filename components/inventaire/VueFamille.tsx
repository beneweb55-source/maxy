"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  IconeChevronGauche, 
  IconeChevronDroite, 
  IconeArchive, 
  IconeRecherche, 
  IconeAlerte,
  IconePlus
} from "@/components/icons";

interface SousCategorieNode {
  id: number;
  nom: string;
  _count: {
    produits: number;
    modeles: number;
  };
}

interface CategorieNode {
  id: number;
  nom: string;
  parent_id: number | null;
  description: string | null;
  image_url: string | null;
  enfants: SousCategorieNode[];
  _count: {
    produits: number;
    modeles: number;
    enfants: number;
  };
}

interface FamilleDetail {
  id: number;
  nom: string;
  description: string | null;
  image_url: string | null;
  categories: CategorieNode[];
}

export default function VueFamille({
  familleId,
  majUrl,
}: {
  familleId: number;
  majUrl: (modifs: Record<string, string | null>) => void;
}) {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") || "";
  const [famille, setFamille] = useState<FamilleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setErreur(null);

    // Charger les catégories de la famille
    fetch(`/api/categories?parent_id=${familleId}`, { signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Erreur de chargement des catégories");
        return res.json();
      })
      .then(async (categories: CategorieNode[]) => {
        if (signal.aborted) return;
        
        // Charger les informations de la famille racine
        const resFamilles = await fetch("/api/categories?tree=1", { signal });
        const dataTree: any[] = await resFamilles.json();
        const fInfo = dataTree.find((f: any) => f.id === familleId);

        setFamille({
          id: familleId,
          nom: fInfo?.nom || `Famille #${familleId}`,
          description: fInfo?.description || null,
          image_url: fInfo?.image_url || null,
          categories: categories || []
        });
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error(err);
        setErreur(err.message || "Erreur réseau");
        setLoading(false);
      });

    return () => controller.abort();
  }, [familleId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 w-64 bg-brand-light-grey/30 dark:bg-white/5 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-40 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-40 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-40 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (erreur || !famille) {
    return (
      <div className="carte p-8 text-center text-danger flex flex-col items-center justify-center animate-entree">
        <IconeAlerte taille={36} className="mb-3 opacity-80" />
        <h3 className="font-bold text-lg font-outfit mb-1">Famille introuvable ou erreur de chargement</h3>
        <p className="text-sm text-brand-warm-grey mb-4">{erreur || "Identifiant de famille invalide"}</p>
        <button
          type="button"
          onClick={() => majUrl({ vue: "cockpit", famille_id: null })}
          className="btn btn-secondaire text-xs"
        >
          <IconeChevronGauche taille={14} /> Retour au Cockpit
        </button>
      </div>
    );
  }

  // Filtrer les catégories (masquer stock à 0 par défaut ou filtrer par recherche)
  const categoriesFiltrees = famille.categories.filter((cat) => {
    const totalProduits = (cat._count?.produits || 0) + (cat.enfants || []).reduce((acc, sc) => acc + (sc._count?.produits || 0), 0);
    if (totalProduits <= 0) return false;
    if (!q.trim()) return true;
    const qLower = q.toLowerCase();
    return (
      cat.nom.toLowerCase().includes(qLower) ||
      cat.enfants.some((sc) => sc.nom.toLowerCase().includes(qLower))
    );
  });

  const totalProduitsFamille = famille.categories.reduce((acc, cat) => {
    const direct = cat._count?.produits || 0;
    const enfants = (cat.enfants || []).reduce((a, sc) => a + (sc._count?.produits || 0), 0);
    return acc + direct + enfants;
  }, 0);

  return (
    <div className="space-y-6 animate-entree">
      {/* Fil d'Ariane & En-tête Tactile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-light-grey/40 dark:border-white/5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => majUrl({ vue: "cockpit", famille_id: null, categorie_id: null, sous_categorie_id: null })}
            className="btn btn-secondaire text-xs py-2 px-3 rounded-xl font-bold bg-white dark:bg-brand-paper shadow-xs hover:border-brand-orange active:scale-[0.98] flex items-center gap-1.5"
          >
            <IconeChevronGauche taille={14} /> Cockpit
          </button>
          <span className="text-brand-warm-grey font-bold">/</span>
          <h1 className="text-xl sm:text-2xl font-black font-outfit text-brand-black dark:text-white">
            {famille.nom}
          </h1>
          <span className="bg-brand-orange/15 text-brand-orange text-xs font-extrabold px-2.5 py-1 rounded-lg ml-2">
            {totalProduitsFamille} articles
          </span>
        </div>

        <button
          type="button"
          onClick={() => majUrl({ vue: "tableau", famille_id: String(familleId), categorie_id: null, sous_categorie_id: null })}
          className="btn btn-primaire text-xs py-2 px-4 rounded-xl font-bold shadow-xs hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <IconeArchive taille={15} /> Voir tous les {totalProduitsFamille} produits de la famille
        </button>
      </div>

      {/* Grille des Catégories (Niveau 2) */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-brand-black dark:text-white font-outfit">
            Catégories disponibles ({categoriesFiltrees.length})
          </h2>
          <p className="text-xs text-brand-warm-grey">
            Touchez une catégorie pour voir ses sous-types de matériels
          </p>
        </div>

        {categoriesFiltrees.length === 0 ? (
          <div className="carte p-8 text-center text-brand-warm-grey rounded-2xl bg-white/50 dark:bg-white/5 border border-dashed border-brand-light-grey dark:border-white/10">
            Aucune catégorie correspondante dans cette famille.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoriesFiltrees.map((cat) => {
              const totalDirect = cat._count?.produits || 0;
              const totalEnfants = (cat.enfants || []).reduce((acc, sc) => acc + (sc._count?.produits || 0), 0);
              const totalCat = totalDirect + totalEnfants;
              const totalModeles = (cat._count?.modeles || 0) + (cat.enfants || []).reduce((acc, sc) => acc + (sc._count?.modeles || 0), 0);
              const sousCatsNonZero = (cat.enfants || []).filter(sc => (sc._count?.produits || 0) > 0);

              return (
                <div
                  key={cat.id}
                  onClick={() => majUrl({ vue: "categorie", categorie_id: String(cat.id), famille_id: String(familleId) })}
                  className="carte group !p-5 border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-[0.985] min-h-[140px] hover:border-brand-orange/60"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-base sm:text-lg font-outfit text-brand-black dark:text-white group-hover:text-brand-orange transition-colors leading-snug">
                        {cat.nom}
                      </h3>
                      <span className="bg-brand-light-grey/40 dark:bg-white/10 text-brand-black dark:text-white px-2.5 py-1 rounded-lg text-xs font-black shrink-0">
                        {totalCat}
                      </span>
                    </div>

                    <div className="text-xs text-brand-warm-grey">
                      {sousCatsNonZero.length} sous-catégorie{sousCatsNonZero.length > 1 ? "s" : ""} · {totalModeles} modèle{totalModeles > 1 ? "s" : ""}
                    </div>

                    {/* Chips d'aperçu des sous-catégories */}
                    {sousCatsNonZero.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-brand-light-grey/30 dark:border-white/5">
                        {sousCatsNonZero.slice(0, 4).map((sc) => (
                          <span 
                            key={sc.id}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-brand-light-grey/25 dark:bg-white/5 text-brand-warm-grey dark:text-brand-grey font-medium"
                          >
                            {sc.nom} ({sc._count.produits})
                          </span>
                        ))}
                        {sousCatsNonZero.length > 4 && (
                          <span className="text-[11px] px-1.5 py-0.5 text-brand-warm-grey">
                            +{sousCatsNonZero.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-brand-light-grey/40 dark:border-white/5 flex items-center justify-between text-xs text-brand-warm-grey group-hover:text-brand-black dark:group-hover:text-white transition-colors font-medium">
                    <span>Explorer les sous-catégories</span>
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
