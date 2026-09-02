import type { StatutProduit } from "@prisma/client";

/**
 * MOTEUR D'ÉTATS D'ATELIER STRICT (State Machine)
 * 
 * Règles métier du cycle de vie du matériel :
 * 1. RECU (Arrivage enregistré) -> EN_TEST (L'atelier commence).
 * 2. EN_TEST -> OK, A_REPARER, MANQUE_PIECE, ou HS.
 * 3. MANQUE_PIECE -> A_REPARER (Pièce reçue).
 * 4. A_REPARER -> OK (Prévois l'ouverture d'un champ de coût de réparation).
 * 5. OK -> EN_VENTE (Prix fixé pour la vitrine).
 * 6. EN_VENTE -> VENDU (Géré par la caisse / facturation).
 * 7. HS et VENDU -> États finaux (Bloqués).
 * 8. PRODUIT_COMMANDE -> VENDU ou EN_VENTE (Réservation).
 */

export interface DefinitionStatut {
  statut: StatutProduit;
  libelle: string;
  description: string;
  transitionsSuivantes: readonly StatutProduit[];
  badge: string;
  couleurHex: string;
  couleurNom: "bleu" | "orange" | "vert" | "rouge" | "sky" | "violet" | "indigo" | "zinc" | "teal";
  estFinal: boolean;
  necessiteCoutReparation?: boolean;
}

export const REGLES_MACHINE_ETATS: Record<StatutProduit, DefinitionStatut> = {
  recu: {
    statut: "recu",
    libelle: "Reçu",
    description: "Arrivage enregistré en stock initial",
    transitionsSuivantes: ["en_test"],
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300",
    couleurHex: "#3b82f6",
    couleurNom: "bleu",
    estFinal: false,
  },
  en_test: {
    statut: "en_test",
    libelle: "En Test",
    description: "Diagnostic atelier et banc d'essai en cours",
    transitionsSuivantes: ["ok", "a_reparer", "manque_piece", "hs"],
    badge: "bg-blue-500/15 text-blue-700 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300",
    couleurHex: "#2563eb",
    couleurNom: "bleu",
    estFinal: false,
  },
  manque_piece: {
    statut: "manque_piece",
    libelle: "Manque Pièce",
    description: "En attente de réception de pièces détachées",
    transitionsSuivantes: ["a_reparer"],
    badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300",
    couleurHex: "#9333ea",
    couleurNom: "violet",
    estFinal: false,
  },
  a_reparer: {
    statut: "a_reparer",
    libelle: "À Réparer",
    description: "Intervention technique ou remplacement de composant",
    transitionsSuivantes: ["ok"],
    badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300",
    couleurHex: "#ea580c",
    couleurNom: "orange",
    estFinal: false,
    necessiteCoutReparation: true,
  },
  ok: {
    statut: "ok",
    libelle: "OK (Testé)",
    description: "Appareil fonctionnel validé, prêt pour fixation du prix ou assemblage",
    transitionsSuivantes: ["en_vente", "assemble"],
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300",
    couleurHex: "#059669",
    couleurNom: "vert",
    estFinal: false,
  },
  en_vente: {
    statut: "en_vente",
    libelle: "En Vente",
    description: "Prix fixé, disponible en vitrine et au catalogue POS",
    transitionsSuivantes: ["vendu", "produit_commande", "assemble"],
    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300",
    couleurHex: "#0284c7",
    couleurNom: "sky",
    estFinal: false,
  },
  produit_commande: {
    statut: "produit_commande",
    libelle: "Commandé / Réservé",
    description: "Réservé sur une commande client en cours",
    transitionsSuivantes: ["vendu", "en_vente"],
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300",
    couleurHex: "#6366f1",
    couleurNom: "indigo",
    estFinal: false,
  },
  hs: {
    statut: "hs",
    libelle: "Hors Service (HS)",
    description: "Appareil irrécupérable / donneur de pièces",
    transitionsSuivantes: [],
    badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300",
    couleurHex: "#dc2626",
    couleurNom: "rouge",
    estFinal: true,
  },
  vendu: {
    statut: "vendu",
    libelle: "Vendu",
    description: "Encaissé et facturé au client",
    transitionsSuivantes: [],
    badge: "bg-zinc-800 text-white border-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
    couleurHex: "#27272a",
    couleurNom: "zinc",
    estFinal: true,
  },
  assemble: {
    statut: "assemble",
    libelle: "Assemblé (BOM)",
    description: "Composant intégré dans un produit parent",
    transitionsSuivantes: ["ok"],
    badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300",
    couleurHex: "#0d9488",
    couleurNom: "teal",
    estFinal: false,
  },
};

/**
 * Renvoie la liste des statuts vers lesquels une transition est autorisée
 */
export function transitionsPossibles(statutActuel: StatutProduit): StatutProduit[] {
  const regle = REGLES_MACHINE_ETATS[statutActuel];
  if (!regle || regle.estFinal) return [];
  return [...regle.transitionsSuivantes];
}

/**
 * Vérifie si une transition entre deux statuts est autorisée
 */
export function peutTransitionner(statutActuel: StatutProduit, nouveauStatut: StatutProduit): boolean {
  if (statutActuel === nouveauStatut) return true; // Même statut autorisé (mise à jour sans changement)
  const transitions = transitionsPossibles(statutActuel);
  return transitions.includes(nouveauStatut);
}

/**
 * Valide rigoureusement une transition et renvoie un message explicatif en cas de refus
 */
export function verifierTransition(
  statutActuel: StatutProduit,
  nouveauStatut: StatutProduit
): { valide: boolean; erreur?: string } {
  if (statutActuel === nouveauStatut) {
    return { valide: true };
  }

  const regle = REGLES_MACHINE_ETATS[statutActuel];
  if (!regle) {
    return { valide: false, erreur: `Statut inconnu: ${statutActuel}` };
  }

  if (regle.estFinal) {
    return {
      valide: false,
      erreur: `L'état « ${regle.libelle} » est un état final verrouillé et ne peut plus être modifié.`,
    };
  }

  if (!regle.transitionsSuivantes.includes(nouveauStatut)) {
    const nomsCibles = regle.transitionsSuivantes
      .map((s) => `« ${REGLES_MACHINE_ETATS[s]?.libelle || s} »`)
      .join(", ");
    
    return {
      valide: false,
      erreur: `Transition non autorisée : un appareil « ${regle.libelle} » ne peut passer que vers ${nomsCibles || "aucun état"}.`,
    };
  }

  return { valide: true };
}

/**
 * Détermine si un produit peut faire l'objet d'un Override au comptoir / POS
 * (Seuls les produits non terminés en stock physique sont éligibles, rejet strict des HS, VENDU, COMMANDE)
 */
export function estEligibleOverrideVente(statut: StatutProduit): boolean {
  return ["recu", "en_test", "ok", "a_reparer", "manque_piece"].includes(statut);
}
