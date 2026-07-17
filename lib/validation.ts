import { validerPhoto } from "./images";

export interface LigneProduitEntree {
  reference: string;
  categorie: string;
  prix_achat: number;
  image_url?: string;
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
      image_url?: unknown;
    };

    const reference = typeof ligne?.reference === "string" ? ligne.reference.trim() : "";
    const categorie = typeof ligne?.categorie === "string" ? ligne.categorie.trim() : "";
    const prix = ligne?.prix_achat;
    const photo =
      typeof ligne?.image_url === "string" && ligne.image_url.trim()
        ? ligne.image_url.trim()
        : undefined;

    if (!reference) {
      return { erreur: `Ligne ${i + 1} : la référence est obligatoire.` };
    }
    if (!categorie) {
      return { erreur: `Ligne ${i + 1} : la catégorie est obligatoire.` };
    }
    if (typeof prix !== "number" || !Number.isInteger(prix) || prix < 0) {
      return { erreur: `Ligne ${i + 1} : le prix d'achat doit être un entier positif en DA.` };
    }
    if (photo) {
      const soucisPhoto = validerPhoto(photo);
      if (soucisPhoto) return { erreur: `Ligne ${i + 1} : ${soucisPhoto}` };
    }

    produits.push({ reference, categorie, prix_achat: prix, image_url: photo });
  }

  return { produits };
}

export function entierPositif(valeur: unknown, champ: string): string | null {
  if (typeof valeur !== "number" || !Number.isInteger(valeur) || valeur <= 0) {
    return `${champ} doit être un entier positif en DA.`;
  }
  return null;
}
