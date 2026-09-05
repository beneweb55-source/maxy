import type { StatutProduit } from "@prisma/client";

/** Nœud arborescent de catégories (Famille > Catégorie > Sous-catégorie) */
export interface CategorieNoeud {
  id: number;
  nom: string;
  parent_id: number | null;
  enfants: CategorieNoeud[];
}

export interface LigneProduit {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  categorie_id?: number | null;
  categorie_rel?: {
    nom: string;
    parent: { nom: string; parent: { nom: string } | null } | null;
  } | null;
  modele_id?: number | null;
  modele?: { id: number; nom: string; image_url?: string | null } | null;
  statut: StatutProduit;
  a_jeter: boolean;
  en_vitrine: boolean;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  numero_serie?: string | null;
  grade?: string | null;
  emplacement?: string | null;
  lot_id: number | null;
  fournisseur: string | null;
  date_entree: string;
  jours_stock: number;
  image_url: string | null;
  nb_images: number;
  etiquette_imprimee: boolean;
  poste_reseaux: boolean;
  nb_composants?: number;
  est_compose?: boolean;
  parent_id?: number | null;
}

export interface GroupeProduits {
  cle: string;
  reference: string;
  categorie: string;
  modele_id: number | null;
  categorie_id: number | null;
  image_url: string | null;
  nbImages: number;
  enVitrine: number;
  nbPostesReseaux: number;
  unites: LigneProduit[];
  prixMin: number;
  prixMax: number;
  venteMin: number | null;
  venteMax: number | null;
  resumeStatuts: { statut: StatutProduit; n: number }[];
  totalDisponibles: number;
}

export interface ReponseInventaire {
  total: number;
  pages: number;
  page: number;
  valeur: number;
  categories: string[];
  lots: { id: number; libelle: string }[];
  produits: LigneProduit[];
}

export interface FormulaireProduit {
  reference: string;
  categorie: string;
  prix_achat: string;
  lot_id: string;
  prix_vente_fixe: string;
  quantite?: string;
}

export const FORMULAIRE_VIDE: FormulaireProduit = {
  reference: "",
  categorie: "",
  prix_achat: "",
  lot_id: "",
  prix_vente_fixe: "",
  quantite: "1",
};

export const COLONNES_TRI = [
  { cle: "code_interne", libelle: "inventaire.colCode" },
  { cle: "reference", libelle: "inventaire.colReference" },
  { cle: "categorie", libelle: "inventaire.colCategorie" },
  { cle: "statut", libelle: "inventaire.colStatut" },
  { cle: "date_entree", libelle: "inventaire.colJours" },
  { cle: "prix_achat", libelle: "inventaire.colPrixAchat" },
  { cle: "prix_vente_fixe", libelle: "inventaire.colPrixVente" },
] as const;
