"use client";

import React, { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Home, Layers, Folder, Tag, TableProperties } from "lucide-react";

export interface BreadcrumbNavigationProps {
  vue: string;
  familleId?: number | null;
  categorieId?: number | null;
  sousCategorieId?: number | null;
  totalArticles?: number;
  majUrl: (modifs: Record<string, string | null>) => void;
}

interface TaxonomyLabelMap {
  familleNom?: string;
  categorieNom?: string;
  sousCategorieNom?: string;
  parentFamilleId?: number | null;
  parentCategorieId?: number | null;
}

export default function BreadcrumbNavigation({
  vue,
  familleId,
  categorieId,
  sousCategorieId,
  totalArticles,
  majUrl,
}: BreadcrumbNavigationProps) {
  const [labels, setLabels] = useState<TaxonomyLabelMap>({});

  // Résolution des libellés exacts de la taxonomie
  useEffect(() => {
    let actif = true;

    async function chargerNoms() {
      try {
        const idCible = sousCategorieId || categorieId || familleId;
        if (!idCible) {
          if (actif) setLabels({});
          return;
        }

        const res = await fetch(`/api/categories/${idCible}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!actif) return;

        if (sousCategorieId) {
          // Niveau 3 (Sous-catégorie)
          setLabels({
            sousCategorieNom: data.nom,
            categorieNom: data.parent?.nom,
            familleNom: data.parent?.parent?.nom,
            parentCategorieId: data.parent?.id,
            parentFamilleId: data.parent?.parent_id,
          });
        } else if (categorieId) {
          // Niveau 2 (Catégorie)
          setLabels({
            categorieNom: data.nom,
            familleNom: data.parent?.nom,
            parentFamilleId: data.parent?.id,
          });
        } else if (familleId) {
          // Niveau 1 (Grande Famille)
          setLabels({
            familleNom: data.nom,
          });
        }
      } catch (err) {
        console.error("Erreur chargement breadcrumb", err);
      }
    }

    chargerNoms();
    return () => {
      actif = false;
    };
  }, [familleId, categorieId, sousCategorieId]);

  // Déterminer la cible du BackButton
  const retourArriere = () => {
    if (sousCategorieId || (vue === "tableau" && categorieId)) {
      // Remonter vers la catégorie
      majUrl({
        vue: "categorie",
        sous_categorie_id: null,
        categorie_id: categorieId ? String(categorieId) : labels.parentCategorieId ? String(labels.parentCategorieId) : null,
        famille_id: familleId ? String(familleId) : labels.parentFamilleId ? String(labels.parentFamilleId) : null,
      });
    } else if (categorieId || (vue === "tableau" && familleId)) {
      // Remonter vers la famille
      majUrl({
        vue: "famille",
        sous_categorie_id: null,
        categorie_id: null,
        famille_id: familleId ? String(familleId) : labels.parentFamilleId ? String(labels.parentFamilleId) : null,
      });
    } else if (familleId || vue === "tableau" || vue === "atraiter") {
      // Remonter au Cockpit racine
      majUrl({
        vue: "cockpit",
        sous_categorie_id: null,
        categorie_id: null,
        famille_id: null,
      });
    }
  };

  const estRacine = vue === "cockpit" && !familleId && !categorieId && !sousCategorieId;

  return (
    <nav aria-label="Fil d'Ariane POS" className="flex items-center gap-2 sm:gap-3 select-none flex-wrap">
      {/* Bouton Retour tactile ergonomique (Hit area >= 44px) */}
      {!estRacine && (
        <button
          type="button"
          onClick={retourArriere}
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 shadow-xs hover:border-brand-orange hover:bg-brand-orange/5 text-brand-black dark:text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all touch-manipulation"
          title="Retour au niveau supérieur"
        >
          <ChevronLeft className="w-4 h-4 text-brand-orange" />
          <span className="hidden xs:inline">Retour</span>
        </button>
      )}

      {/* Conteneur Fil d'Ariane avec séparateurs visuels */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap bg-brand-light-grey/20 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-brand-light-grey/40 dark:border-white/5 min-h-[44px]">
        {/* Étape 1 : Cockpit */}
        <button
          type="button"
          onClick={() =>
            majUrl({
              vue: "cockpit",
              famille_id: null,
              categorie_id: null,
              sous_categorie_id: null,
            })
          }
          className={`flex items-center gap-1 text-xs font-bold transition-colors py-1 px-1.5 rounded-lg ${
            estRacine
              ? "text-brand-orange font-extrabold"
              : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Cockpit</span>
        </button>

        {/* Étape 2 : Grande Famille */}
        {familleId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-brand-warm-grey/50 shrink-0" />
            <button
              type="button"
              onClick={() =>
                majUrl({
                  vue: "famille",
                  famille_id: String(familleId),
                  categorie_id: null,
                  sous_categorie_id: null,
                })
              }
              className={`flex items-center gap-1 text-xs font-bold transition-colors py-1 px-1.5 rounded-lg truncate max-w-[160px] ${
                vue === "famille" && !categorieId && !sousCategorieId
                  ? "text-brand-orange font-extrabold bg-brand-orange/10"
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.familleNom || `Famille #${familleId}`}</span>
            </button>
          </>
        )}

        {/* Étape 3 : Catégorie */}
        {categorieId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-brand-warm-grey/50 shrink-0" />
            <button
              type="button"
              onClick={() =>
                majUrl({
                  vue: "categorie",
                  categorie_id: String(categorieId),
                  famille_id: familleId ? String(familleId) : labels.parentFamilleId ? String(labels.parentFamilleId) : null,
                  sous_categorie_id: null,
                })
              }
              className={`flex items-center gap-1 text-xs font-bold transition-colors py-1 px-1.5 rounded-lg truncate max-w-[160px] ${
                vue === "categorie" && !sousCategorieId
                  ? "text-brand-orange font-extrabold bg-brand-orange/10"
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.categorieNom || `Catégorie #${categorieId}`}</span>
            </button>
          </>
        )}

        {/* Étape 4 : Sous-catégorie */}
        {sousCategorieId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-brand-warm-grey/50 shrink-0" />
            <span className="flex items-center gap-1 text-xs font-extrabold text-brand-orange bg-brand-orange/10 py-1 px-2 rounded-lg truncate max-w-[180px]">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labels.sousCategorieNom || `Sous-cat #${sousCategorieId}`}</span>
            </span>
          </>
        )}

        {/* Étape alternative : Tableau d'inventaire complet */}
        {vue === "tableau" && !sousCategorieId && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-brand-warm-grey/50 shrink-0" />
            <span className="flex items-center gap-1 text-xs font-extrabold text-brand-black dark:text-white py-1 px-1.5 rounded-lg">
              <TableProperties className="w-3.5 h-3.5" />
              <span>Inventaire</span>
            </span>
          </>
        )}

        {/* Badge du nombre d'articles */}
        {totalArticles !== undefined && (
          <span className="bg-brand-black/10 text-brand-black dark:bg-white/10 dark:text-brand-orange dark:border dark:border-brand-orange/30 text-[11px] font-black px-2.5 py-0.5 rounded-full ml-1 shrink-0">
            {totalArticles}
          </span>
        )}
      </div>
    </nav>
  );
}
