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
import { Layers, Tag } from "lucide-react";

/** Palette de couleurs pour les icônes de catégorie (rotation par index) */
const CAT_COLORS = [
  { bg: "bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300", ring: "ring-blue-200 dark:ring-blue-800/40" },
  { bg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-800/40" },
  { bg: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-800/40" },
  { bg: "bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-300", ring: "ring-purple-200 dark:ring-purple-800/40" },
  { bg: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-800/40" },
  { bg: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-300", ring: "ring-cyan-200 dark:ring-cyan-800/40" },
  { bg: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300", ring: "ring-violet-200 dark:ring-violet-800/40" },
  { bg: "bg-teal-500/10 text-teal-600 dark:bg-teal-400/15 dark:text-teal-300", ring: "ring-teal-200 dark:ring-teal-800/40" },
  { bg: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300", ring: "ring-sky-200 dark:ring-sky-800/40" },
];
import BreadcrumbNavigation from "./BreadcrumbNavigation";

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

    // Charger directement les détails de la famille et ses catégories rattachées
    fetch(`/api/categories/${familleId}`, { signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Erreur de chargement de la famille");
        return res.json();
      })
      .then((data: any) => {
        if (signal.aborted) return;
        
        setFamille({
          id: data.id,
          nom: data.nom || `Famille #${familleId}`,
          description: data.description || null,
          image_url: data.image_url || null,
          categories: data.enfants || [],
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

  // Filtrer les catégories : afficher toutes les catégories (même vides) pour la navigation
  // + filtre de recherche
  const categoriesFiltrees = (famille.categories || []).filter((cat) => {
    if (!q.trim()) return true;
    const qLower = q.toLowerCase();
    return (
      cat.nom.toLowerCase().includes(qLower) ||
      (cat.enfants || []).some((sc) => sc.nom.toLowerCase().includes(qLower))
    );
  });

  const totalProduitsFamille = (famille.categories || []).reduce((acc, cat) => {
    const direct = cat._count?.produits || 0;
    const enfants = (cat.enfants || []).reduce((a, sc) => a + (sc._count?.produits || 0), 0);
    return acc + direct + enfants;
  }, 0);

  return (
    <div className="space-y-6 animate-entree">
      {/* En-tête de section Famille */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-light-grey/40 dark:border-white/5">
        <div>
          <h2 className="text-lg sm:text-xl font-black font-outfit text-brand-black dark:text-white">
            {famille.nom}
          </h2>
          <p className="text-xs text-brand-warm-grey">
            Sélectionnez une catégorie pour explorer ses sous-types de matériels
          </p>
        </div>

        <button
          type="button"
          onClick={() => majUrl({ vue: "tableau", famille_id: String(familleId), categorie_id: null, sous_categorie_id: null })}
          className="btn btn-primaire text-xs py-2 px-4 rounded-xl font-bold shadow-xs hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
        >
          <IconeArchive taille={15} /> Voir tous les {totalProduitsFamille} produits de la famille
        </button>
      </div>

      {/* Grille des Catégories (Niveau 2) */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-brand-black dark:text-white font-outfit">
            Catégories disponibles ({categoriesFiltrees.length})
          </h3>
        </div>

        {categoriesFiltrees.length === 0 ? (
          <div className="carte p-8 text-center text-brand-warm-grey rounded-2xl bg-white/50 dark:bg-white/5 border border-dashed border-brand-light-grey dark:border-white/10">
            Aucune catégorie avec du stock disponible dans cette famille.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoriesFiltrees.map((cat, idx) => {
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
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${CAT_COLORS[idx % CAT_COLORS.length]!.bg}`}>
                        <Tag className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base sm:text-lg font-outfit text-brand-black dark:text-white group-hover:text-brand-orange transition-colors leading-snug">
                            {cat.nom}
                          </h3>
                          <span className="bg-brand-light-grey/40 dark:bg-white/10 text-brand-black dark:text-white px-2.5 py-1 rounded-lg text-xs font-black shrink-0">
                            {totalCat}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-brand-warm-grey mt-1">
                      {sousCatsNonZero.length} sous-catégorie{sousCatsNonZero.length > 1 ? "s" : ""} · {totalModeles} modèle{totalModeles > 1 ? "s" : ""}
                    </div>

                    {/* Chips d'aperçu des sous-catégories STRICTEMENT NON-VIDES */}
                    {sousCatsNonZero.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-brand-light-grey/30 dark:border-white/5">
                        {sousCatsNonZero.slice(0, 4).map((sc) => (
                          <span 
                            key={sc.id}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-brand-light-grey/25 dark:bg-white/5 text-brand-warm-grey dark:text-brand-grey font-medium"
                          >
                            {sc.nom} {sc._count?.produits ? `(${sc._count.produits})` : ""}
                          </span>
                        ))}
                        {sousCatsNonZero.length > 4 && (
                          <span className="text-[11px] px-1.5 py-0.5 text-brand-warm-grey font-semibold">
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
