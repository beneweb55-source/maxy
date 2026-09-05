export const SESSION_COOKIE = "session";

/** Canaux de vente — source unique pour tout l'app (POS, Commandes, Factures) */
export const CANAUX_VENTE = [
  { key: "COMPTOIR", label: "Comptoir" },
  { key: "YALIDINE", label: "Yalidine" },
  { key: "OUEDKNISS", label: "Ouedkniss" },
  { key: "TELEPHONE", label: "Téléphone" },
  { key: "FACEBOOK", label: "Facebook" },
] as const;

export type CanalVenteKey = (typeof CANAUX_VENTE)[number]["key"];

/** Labels lisibles des statuts de commande */
export const LABELS_STATUT_COMMANDE: Record<string, string> = {
  EN_ATTENTE: "En Attente",
  CONFIRMEE: "Confirmée",
  EN_LIVRAISON: "En Livraison",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};
