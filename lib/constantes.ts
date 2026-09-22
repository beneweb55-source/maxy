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

/**
 * Interrupteur d'impression du code-barres sur les étiquettes produits.
 *
 * `false` (état actuel) : le code-barres n'est pas imprimé — l'étiquette ne
 * porte que les détails du produit et le prix, pour reconnaître l'article
 * physiquement. `true` : le code-barres vectoriel est de nouveau imprimé.
 *
 * Le SYSTÈME code-barres n'est pas supprimé pour autant : la génération
 * (`react-barcode`), la lecture (`/api/scan`), le champ `code_interne` et le
 * marquage « étiquette imprimée » restent en place et fonctionnels.
 * Repasser cette constante à `true` suffit à réafficher le code-barres.
 */
export const AFFICHER_CODE_BARRE_ETIQUETTE = false;
