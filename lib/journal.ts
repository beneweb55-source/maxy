import type { Prisma } from "@prisma/client";

/**
 * Enregistre une entrée dans le journal d'activité (audit log).
 * Doit être appelé à l'intérieur d'une transaction Prisma pour rester atomique
 * avec les modifications métier.
 *
 * @param tx          Client de transaction Prisma
 * @param userId      L'utilisateur à l'origine de l'action
 * @param action      Code d'action ("lot.creer", "produit.statut", "vente.enregistrer"…)
 * @param entiteType  Type d'entité ciblée ("lot", "produit", "vente", "mouvement"…)
 * @param entiteId    ID de l'entité ciblée (optionnel)
 * @param details     Objet libre de détails (ancien/nouveau statut, montant, etc.)
 */
export async function enregistrerActivite(
  tx: any,
  userId: number,
  action: string,
  entiteType?: string,
  entiteId?: number,
  details?: Record<string, unknown>
): Promise<void> {
  await tx.journalActivite.create({
    data: {
      user_id: userId,
      action,
      entite_type: entiteType ?? null,
      entite_id: entiteId ?? null,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

/** Actions normalisées pour le journal */
export const ACTIONS_JOURNAL = {
  // Authentification
  AUTH_CONNEXION: "auth.connexion",
  AUTH_ECHEC: "auth.echec",

  // Lots
  LOT_CREER: "lot.creer",
  LOT_CLOTURER: "lot.cloturer",
  LOT_VALIDER_COUT: "lot.valider_cout",

  // Produits
  PRODUIT_STATUT: "produit.statut",
  PRODUIT_AJOUTER: "produit.ajouter",
  PRODUIT_MODIFIER: "produit.modifier",
  PRODUIT_SUPPRIMER: "produit.supprimer",
  PRODUIT_PRIX: "produit.prix",
  PRODUIT_REPARATION: "produit.reparation",

  // Ventes
  VENTE_ENREGISTRER: "vente.enregistrer",
  VENTE_ANNULER: "vente.annuler",

  // Caisse
  CAISSE_MOUVEMENT: "caisse.mouvement",
  CAISSE_REPARTITION: "caisse.repartition",

  // Rapports
  RAPPORT_DECISION: "rapport.decision",
  RAPPORT_VALIDER: "rapport.valider",

  // Admin
  PARAMETRES_MODIFIER: "parametres.modifier",
  BACKUP_EXPORTER: "backup.exporter",
  BACKUP_RESTAURER: "backup.restaurer",
} as const;

export type ActionJournal = (typeof ACTIONS_JOURNAL)[keyof typeof ACTIONS_JOURNAL];
