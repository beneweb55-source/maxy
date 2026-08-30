import { validerPhoto } from "./images";

// Nombre maximum de photos conservées par produit (couverture + galerie).
export const MAX_PHOTOS_PRODUIT = 10;

// Quantité maximale de produits identiques créés en une seule opération.
export const MAX_QUANTITE_PRODUITS = 500;

export interface LigneProduitEntree {
  reference: string;
  categorie: string;
  modele_id?: number | null;
  categorie_id?: number | null;
  numero_serie?: string | null;
  grade?: string | null;
  emplacement?: string | null;
  prix_achat: number;
  prix_vente_fixe?: number | null;
  /** Photo de couverture (= images[0]), conservée pour la rétro-compatibilité. */
  image_url?: string;
  /** Galerie complète et ordonnée ; le premier élément est la couverture. */
  images: string[];
}

// Extrait et valide la liste de photos d'une ligne : accepte soit `images`
// (tableau, nouveau format), soit `image_url` (photo unique, ancien format).
function extraireImages(ligne: {
  image_url?: unknown;
  images?: unknown;
}): { images: string[]; erreur?: undefined } | { erreur: string; images?: undefined } {
  let brutes: string[] = [];
  if (Array.isArray(ligne?.images)) {
    brutes = ligne.images
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  } else if (typeof ligne?.image_url === "string" && ligne.image_url.trim()) {
    brutes = [ligne.image_url.trim()];
  }

  if (brutes.length > MAX_PHOTOS_PRODUIT) {
    return { erreur: `${MAX_PHOTOS_PRODUIT} photos maximum par produit.` };
  }
  for (const photo of brutes) {
    const souci = validerPhoto(photo);
    if (souci) return { erreur: souci };
  }
  return { images: brutes };
}

export function validerLignesProduits(
  brut: unknown
): { produits: LigneProduitEntree[]; erreur?: undefined } | { erreur: string; produits?: undefined } {
  if (!Array.isArray(brut) || brut.length === 0) {
    return { erreur: "Ajoutez au moins un produit au lot." };
  }

  const produits: LigneProduitEntree[] = [];
  for (let i = 0; i < brut.length; i++) {
    const ligne = brut[i] as {
      reference?: unknown;
      categorie?: unknown;
      prix_achat?: unknown;
      prix_vente_fixe?: unknown;
      image_url?: unknown;
      images?: unknown;
    };

    const reference = typeof ligne?.reference === "string" ? ligne.reference.trim() : "";
    const categorie = typeof ligne?.categorie === "string" ? ligne.categorie.trim() : "";
    const prix = ligne?.prix_achat;
    const prixVente = typeof ligne?.prix_vente_fixe === "number" ? ligne.prix_vente_fixe : null;

    if (!reference) {
      return { erreur: `Ligne ${i + 1} : la référence est obligatoire.` };
    }
    if (!categorie) {
      return { erreur: `Ligne ${i + 1} : la catégorie est obligatoire.` };
    }
    if (typeof prix !== "number" || !Number.isInteger(prix) || prix < 0) {
      return { erreur: `Ligne ${i + 1} : le prix d'achat doit être un entier positif en DA.` };
    }
    const resImages = extraireImages(ligne);
    if (resImages.erreur !== undefined) return { erreur: `Ligne ${i + 1} : ${resImages.erreur}` };

    produits.push({
      reference,
      categorie,
      prix_achat: prix,
      prix_vente_fixe: prixVente,
      image_url: resImages.images[0],
      images: resImages.images,
    });
  }

  return { produits };
}

export function entierPositif(valeur: unknown, champ: string): string | null {
  if (typeof valeur !== "number" || !Number.isInteger(valeur) || valeur <= 0) {
    return `${champ} doit être un entier positif en DA.`;
  }
  return null;
}
