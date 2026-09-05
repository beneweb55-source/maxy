"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  IconeChevronGauche,
  IconeChevronDroite,
  IconeArchive,
  IconeAlerte
} from "@/components/icons";
import { Package } from "lucide-react";

/** Palette de couleurs pour les icônes de sous-catégorie */
const SC_COLORS = [
  { bg: "bg-sky-500/10 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300" },
  { bg: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300" },
  { bg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300" },
  { bg: "bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300" },
  { bg: "bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300" },
  { bg: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-300" },
  { bg: "bg-violet-500/10 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300" },
  { bg: "bg-teal-500/10 text-teal-600 dark:bg-teal-400/15 dark:text-teal-300" },
];
import BreadcrumbNavigation from "./BreadcrumbNavigation";

interface SousCategorieDetail {
  id: number;
  nom: string;
  parent_id: number | null;
  description: string | null;
  image_url: string | null;
  _count: {
    produits: number;
    modeles: number;
  };
}

interface CategorieDetail {
  id: number;
  nom: string;
  parent_id: number | null;
  parent?: {
    id: number;
    nom: string;
  } | null;
  sousCategories: SousCategorieDetail[];
}

export default function VueCategorie({
  categorieId,
  majUrl,
}: {
  categorieId: number;
  majUrl: (modifs: Record<string, string | null>) => void;
}) {
  const searchParams = useSearchParams();
  const q = searchParams?.get("q") || "";
  const [categorie, setCategorie] = useState<CategorieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setErreur(null);

    // Charger directement les détails de la catégorie et ses sous-catégories
    fetch(`/api/categories/${categorieId}`, { signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Erreur lors du chargement de la catégorie");
        return res.json();
      })
      .then((data: any) => {
        if (signal.aborted) return;

        setCategorie({
          id: data.id,
          nom: data.nom || `Catégorie #${categorieId}`,
          parent_id: data.parent?.id || null,
          parent: data.parent ? { id: data.parent.id, nom: data.parent.nom } : null,
          sousCategories: data.enfants || [],
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
  }, [categorieId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 w-72 bg-brand-light-grey/30 dark:bg-white/5 rounded-xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-36 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-36 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-36 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
          <div className="h-36 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (erreur || !categorie) {
    return (
      <div className="carte p-8 text-center text-danger flex flex-col items-center justify-center animate-entree">
        <IconeAlerte taille={36} className="mb-3 opacity-80" />
        <h3 className="font-bold text-lg font-outfit mb-1">Catégorie introuvable</h3>
        <p className="text-sm text-brand-warm-grey mb-4">{erreur || "Identifiant de catégorie invalide"}</p>
        <button
          type="button"
          onClick={() => majUrl({ vue: "cockpit", categorie_id: null, famille_id: null })}
          className="btn btn-secondaire text-xs"
        >
          <IconeChevronGauche taille={14} /> Retour au Cockpit
        </button>
      </div>
    );
  }

  // Filtrer les sous-catégories : afficher toutes les sous-catégories + filtre de recherche
  const sousCatsFiltrees = (categorie.sousCategories || []).filter((sc) => {
    if (!q.trim()) return true;
    return sc.nom.toLowerCase().includes(q.toLowerCase());
  });

  const totalProduitsCat = (categorie.sousCategories || []).reduce((acc, sc) => acc + (sc._count?.produits || 0), 0);

  return (
    <div className="space-y-6 animate-entree">
      {/* En-tête de section Catégorie */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-light-grey/40 dark:border-white/5">
        <div>
          <h2 className="text-lg sm:text-xl font-black font-outfit text-brand-black dark:text-white">
            {categorie.nom}
          </h2>
          <p className="text-xs text-brand-warm-grey">
            Touchez un sous-type pour afficher immédiatement sa grille de produits
          </p>
        </div>

        <button
          type="button"
          onClick={() => majUrl({ vue: "tableau", categorie_id: String(categorieId), sous_categorie_id: null })}
          className="btn btn-primaire text-xs py-2 px-4 rounded-xl font-bold shadow-xs hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
        >
          <IconeArchive taille={15} /> Voir toute la catégorie ({totalProduitsCat})
        </button>
      </div>

      {/* Grille des Sous-Catégories (Niveau 3) */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-brand-black dark:text-white font-outfit">
            Sous-types de matériels disponibles ({sousCatsFiltrees.length})
          </h3>
        </div>

        {sousCatsFiltrees.length === 0 ? (
          <div className="carte p-8 text-center text-brand-warm-grey rounded-2xl bg-white/50 dark:bg-white/5 border border-dashed border-brand-light-grey dark:border-white/10">
            Aucun sous-type avec du stock disponible dans cette catégorie.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sousCatsFiltrees.map((sc, idx) => {
              return (
                <div
                  key={sc.id}
                  onClick={() => majUrl({
                    vue: "tableau",
                    sous_categorie_id: String(sc.id),
                    categorie_id: String(categorieId),
                    famille_id: categorie.parent_id ? String(categorie.parent_id) : null
                  })}
                  className="carte group !p-5 border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between active:scale-[0.985] min-h-[130px] hover:border-brand-orange/60"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${SC_COLORS[idx % SC_COLORS.length]!.bg}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-base font-outfit text-brand-black dark:text-white group-hover:text-brand-orange transition-colors leading-snug">
                            {sc.nom}
                          </h3>
                          <span className="bg-brand-light-grey/40 dark:bg-white/10 text-brand-black dark:text-white px-2.5 py-0.5 rounded-md text-xs font-black shrink-0">
                            {sc._count.produits}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-brand-warm-grey mt-1">
                      {sc._count.modeles} modèle{sc._count.modeles > 1 ? "s" : ""} référencé{sc._count.modeles > 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-brand-light-grey/40 dark:border-white/5 flex items-center justify-between text-xs text-brand-warm-grey group-hover:text-brand-black dark:group-hover:text-white transition-colors font-medium">
                    <span>Voir les articles</span>
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
