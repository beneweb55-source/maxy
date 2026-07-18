import type { StatutProduit, StatutLot } from "@prisma/client";



export const STATUTS_PRODUIT: readonly StatutProduit[] = [
  "recu",
  "en_test",
  "ok",
  "a_reparer",
  "manque_piece",
  "hs",
  "en_vente",
  "vendu",
];

interface InfosStatut {
  libelle: string;
  badge: string;
  hex: string;
}

export const INFOS_STATUT: Record<StatutProduit, InfosStatut> = {
  recu: { libelle: "Reçu", badge: "bg-blue-50 text-blue-800", hex: "#3b82f6" },
  en_test: { libelle: "En test", badge: "bg-amber-50 text-amber-800", hex: "#d97706" },
  ok: { libelle: "OK", badge: "bg-emerald-50 text-emerald-800", hex: "#059669" },
  a_reparer: { libelle: "À réparer", badge: "bg-orange-50 text-orange-800", hex: "#F86822" },
  manque_piece: { libelle: "Manque pièce", badge: "bg-purple-50 text-purple-800", hex: "#9333ea" },
  hs: { libelle: "HS", badge: "bg-red-50 text-red-800", hex: "#dc2626" },
  en_vente: { libelle: "En vente", badge: "bg-sky-50 text-sky-800", hex: "#1770E5" },
  vendu: { libelle: "Vendu", badge: "bg-brand-smooth text-white", hex: "#2E2D2D" },
};

export const INFOS_STATUT_LOT: Record<StatutLot, { libelle: string; badge: string }> = {
  en_cours_de_test: { libelle: "En cours de test", badge: "bg-amber-50 text-amber-800" },
  teste: { libelle: "Testé", badge: "bg-blue-50 text-blue-800" },
  valide: { libelle: "Validé", badge: "bg-emerald-50 text-emerald-800" },
};

// Distinction logique fonctionnel / défectueux (HS et à réparer).
export const STATUTS_DEFAUT: readonly StatutProduit[] = ["a_reparer", "manque_piece", "hs"];

export function estHS(statut: StatutProduit): boolean {
  return statut === "hs";
}

export function estFonctionnel(statut: StatutProduit): boolean {
  return !STATUTS_DEFAUT.includes(statut);
}

// Style du sous-statut « À jeter » (HS non récupérable pour pièces).
export const BADGE_A_JETER = "bg-red-900 text-white";

export function libelleStatut(statut: StatutProduit): string {
  return INFOS_STATUT[statut].libelle;
}
