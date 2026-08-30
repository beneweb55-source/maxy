"use client";

import { useMemo } from "react";
import { IconeTableauDeBord, IconeBaseDeDonnees, IconeArchive, IconeReglages, IconePlus, IconeCurseurs, IconeRapport, IconeInfo, IconeChevronDroite, IconeRecherche, IconeMenu } from "@/components/icons";
import { NoeudTaxonomie } from "@/lib/taxonomie";

// Mapper les noms d'icônes aux vrais composants React
const ICONS: Record<string, React.FC<any>> = {
  IconeTableauDeBord,
  IconeBaseDeDonnees,
  IconeArchive,
  IconeReglages,
  IconePlus,
  IconeCurseurs,
  IconeRapport,
  IconeInfo
};

export default function NavigationTaxonomie({
  arbre,
  familleSelectionnee,
  categorieSelectionnee,
  sousCategorieSelectionnee,
  setFamille,
  setCategorie,
  setSousCategorie,
  totalProduits
}: {
  arbre: Record<string, NoeudTaxonomie>;
  familleSelectionnee: string | null;
  categorieSelectionnee: string | null;
  sousCategorieSelectionnee: string | null;
  setFamille: (f: string | null) => void;
  setCategorie: (c: string | null) => void;
  setSousCategorie: (s: string | null) => void;
  totalProduits: number;
}) {
  
  // Rendu de la "Breadcrumb" / Fil d'Ariane
  const renderBreadcrumb = () => {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-400 mb-6 px-2 overflow-x-auto whitespace-nowrap pb-2">
        <button 
          onClick={() => { setFamille(null); setCategorie(null); setSousCategorie(null); }}
          className={`flex items-center hover:text-white transition-colors ${!familleSelectionnee ? "text-blue-400 font-semibold" : ""}`}
        >
          <IconeMenu className="mr-1" taille={16} />
          Tout le catalogue ({totalProduits})
        </button>
        
        {familleSelectionnee && (
          <>
            <IconeChevronDroite taille={14} className="text-gray-600 flex-shrink-0" />
            <button 
              onClick={() => { setCategorie(null); setSousCategorie(null); }}
              className={`hover:text-white transition-colors ${!categorieSelectionnee ? "text-blue-400 font-semibold" : ""}`}
            >
              {familleSelectionnee}
            </button>
          </>
        )}

        {categorieSelectionnee && (
          <>
            <IconeChevronDroite taille={14} className="text-gray-600 flex-shrink-0" />
            <button 
              onClick={() => setSousCategorie(null)}
              className={`hover:text-white transition-colors ${!sousCategorieSelectionnee ? "text-blue-400 font-semibold" : ""}`}
            >
              {categorieSelectionnee}
            </button>
          </>
        )}

        {sousCategorieSelectionnee && (
          <>
            <IconeChevronDroite taille={14} className="text-gray-600 flex-shrink-0" />
            <span className="text-blue-400 font-semibold">
              {sousCategorieSelectionnee}
            </span>
          </>
        )}
      </div>
    );
  };

  // Les noeuds actuels à afficher
  let noeudsCourants: Record<string, NoeudTaxonomie> = arbre;
  let niveau = 1;

  if (familleSelectionnee && arbre[familleSelectionnee]?.enfants) {
    noeudsCourants = arbre[familleSelectionnee].enfants!;
    niveau = 2;
  }
  
  if (familleSelectionnee && categorieSelectionnee && arbre[familleSelectionnee]?.enfants?.[categorieSelectionnee]?.enfants) {
    noeudsCourants = arbre[familleSelectionnee].enfants![categorieSelectionnee].enfants!;
    niveau = 3;
  }

  // Si on est au dernier niveau (sousCategorieSelectionnee est défini), on n'affiche plus de tuiles
  if (sousCategorieSelectionnee) {
    return <div>{renderBreadcrumb()}</div>;
  }

  return (
    <div className="w-full flex flex-col">
      {renderBreadcrumb()}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-2 pb-8">
        {Object.entries(noeudsCourants).map(([nom, data]) => {
          const IconComponent = (data.icone && ICONS[data.icone] ? ICONS[data.icone] : IconeArchive) as React.ElementType;
          
          return (
            <button
              key={nom}
              onClick={() => {
                if (niveau === 1) {
                  setFamille(nom);
                  setCategorie(null);
                  setSousCategorie(null);
                } else if (niveau === 2) {
                  setCategorie(nom);
                  setSousCategorie(null);
                } else if (niveau === 3) {
                  setSousCategorie(nom);
                }
              }}
              className="flex flex-col items-center justify-center p-4 bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 hover:border-blue-500/50 rounded-2xl transition-all shadow-sm hover:shadow-blue-500/10 min-h-[120px] text-center group active:scale-95"
            >
              <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center mb-3 text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-transform">
                <IconComponent taille={28} />
              </div>
              <span className="font-medium text-gray-200 text-sm leading-tight group-hover:text-white transition-colors">{nom}</span>
              {data.count !== undefined && (
                <span className="text-xs text-gray-500 mt-1">{data.count} produit{data.count > 1 ? 's' : ''}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
