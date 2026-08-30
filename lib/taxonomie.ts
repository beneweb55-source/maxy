/**
 * Taxonomie Additive : Associe chaque catégorie existante à une Famille
 * et optionnellement une Sous-catégorie sans altérer la base de données.
 */

export interface NoeudTaxonomie {
  famille: string;
  categorie: string;
  sousCategorie?: string;
}

export const MAPPING_CATEGORIES: Record<string, NoeudTaxonomie> = {
  "laptop": { famille: "Informatique", categorie: "Laptops" },
  "ordinateurs de bureau": { famille: "Informatique", categorie: "Ordinateurs de Bureau" },
  "ordinateurs de bureau (mini ...": { famille: "Informatique", categorie: "Ordinateurs de Bureau", sousCategorie: "Mini PC" },
  "serveurs rack": { famille: "Informatique", categorie: "Serveurs Rack" },
  "mini pc": { famille: "Informatique", categorie: "Mini PC" },
  "sata — 3,5\" hdd": { famille: "Stockage", categorie: "Disques SATA", sousCategorie: "3,5\" HDD" },
  "sata": { famille: "Stockage", categorie: "Disques SATA" },
  "sas — 2,5\" — 600gb / 900gb hdd": { famille: "Stockage", categorie: "Disques SAS 2,5\"", sousCategorie: "600GB / 900GB" },
  "sas — 2,5\" — 300gb / 146gb": { famille: "Stockage", categorie: "Disques SAS 2,5\"", sousCategorie: "300GB / 146GB" },
  "stockage-disque sas": { famille: "Stockage", categorie: "Disques SAS" },
  "intel": { famille: "Composants", categorie: "Processeurs Intel" },
  "carte graphique": { famille: "Composants", categorie: "Cartes Graphiques" },
  "hpe / hp(alimentations serve...": { famille: "Composants", categorie: "Alimentations Serveur" },
  "chargeur lenovo": { famille: "Accessoires", categorie: "Chargeurs", sousCategorie: "Lenovo" },
  "cable": { famille: "Accessoires", categorie: "Câbles" },
  "adaptateurs": { famille: "Accessoires", categorie: "Adaptateurs" },
  "accessoires et équipements ...": { famille: "Accessoires", categorie: "Accessoires & Équipements" },
};

export function classifierCategorie(categorieBrute: string): NoeudTaxonomie {
  if (!categorieBrute) return { famille: "Non classé", categorie: "Non classé" };
  const cle = categorieBrute.trim().toLowerCase();
  if (MAPPING_CATEGORIES[cle]) {
    return MAPPING_CATEGORIES[cle];
  }
  // Déduction heuristique pour toute nouvelle catégorie
  if (cle.includes("hdd") || cle.includes("ssd") || cle.includes("sas") || cle.includes("sata") || cle.includes("disque") || cle.includes("stockage")) {
    return { famille: "Stockage", categorie: categorieBrute };
  }
  if (cle.includes("pc") || cle.includes("laptop") || cle.includes("ordinateur") || cle.includes("serveur") || cle.includes("ecran")) {
    return { famille: "Informatique", categorie: categorieBrute };
  }
  if (cle.includes("cable") || cle.includes("chargeur") || cle.includes("adaptateur") || cle.includes("accessoire")) {
    return { famille: "Accessoires", categorie: categorieBrute };
  }
  if (cle.includes("carte") || cle.includes("ram") || cle.includes("processeur") || cle.includes("intel") || cle.includes("alim")) {
    return { famille: "Composants", categorie: categorieBrute };
  }
  return { famille: "Autres", categorie: categorieBrute };
}
