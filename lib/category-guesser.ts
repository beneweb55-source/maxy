/**
 * Utilitaire d'Auto-Catégorisation Intelligente (Category Guesser)
 * Délégué à la taxonomie canonique — ce fichier est un wrapper rétrocompatible.
 *
 * Les noms de familles / catégories proviennent de lib/taxonomie-canonical.ts
 * afin de garantir la cohérence avec la base de données.
 */

import {
  devinerCategorie as _devinerCategorie,
  type NoeudTaxonomie,
} from "./taxonomie-canonical";

export interface SuggestionCategorie {
  familleNom: string;
  categorieNom: string;
  sousCategorieNom?: string;
  confiance: number; // 0 à 100
  motif: string;
}

/**
 * Devine la catégorie la plus pertinente en fonction du texte entré.
 * Utilise la taxonomie canonique pour garantir la cohérence avec la base.
 */
export function devinerCategorie(texte: string): SuggestionCategorie | null {
  const noeud: NoeudTaxonomie | null = _devinerCategorie(texte);
  if (!noeud) return null;

  return {
    familleNom: noeud.famille,
    categorieNom: noeud.categorie,
    sousCategorieNom: noeud.sousCategorie,
    confiance: 85, // confiance par défaut pour les correspondances canoniques
    motif: `Correspondance détectée sur « ${noeud.categorie} »`,
  };
}
