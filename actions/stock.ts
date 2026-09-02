"use server";

import { utilisateurCourant } from "@/lib/session";
import { StockService, type OptionsCreationExemplaires, type ResultatMutationStock } from "@/lib/stock-service";
import { revalidatePath } from "next/cache";

/**
 * Server Action : Définit directement la quantité globale en stock d'un modèle.
 * Déclenche la création automatique des exemplaires manquants ou la diminution sécurisée.
 */
export async function actionSetStockQuantity(
  modeleId: number,
  nouvelleQuantite: number
): Promise<{ succes: boolean; donnees?: ResultatMutationStock; erreur?: string }> {
  try {
    const user = await utilisateurCourant();
    if (!user) {
      return { succes: false, erreur: "Session expirée. Veuillez vous reconnecter." };
    }

    if (!Number.isInteger(modeleId) || modeleId <= 0) {
      return { succes: false, erreur: "Identifiant de modèle invalide." };
    }

    const qte = Math.floor(nouvelleQuantite);
    if (!Number.isInteger(qte) || qte < 0) {
      return { succes: false, erreur: "La quantité doit être un entier supérieur ou égal à 0." };
    }

    const resultat = await StockService.setStockQuantity(modeleId, qte, user.id);
    
    // Revalidation des chemins sensibles
    revalidatePath("/inventaire");
    revalidatePath("/produits");

    return { succes: true, donnees: resultat };
  } catch (err: any) {
    console.error("actionSetStockQuantity error:", err);
    return { succes: false, erreur: err.message || "Erreur lors de la modification de la quantité." };
  }
}

/**
 * Server Action : Création en masse d'exemplaires via UniversalStockManager.
 */
export async function actionCreateExemplaires(
  options: OptionsCreationExemplaires
): Promise<{ succes: boolean; donnees?: ResultatMutationStock; erreur?: string }> {
  try {
    const user = await utilisateurCourant();
    if (!user) {
      return { succes: false, erreur: "Session expirée. Veuillez vous reconnecter." };
    }

    const qty = Math.floor(options.quantite);
    if (!Number.isInteger(qty) || qty <= 0) {
      return { succes: false, erreur: "Le nombre d'exemplaires à créer doit être supérieur à 0." };
    }

    const resultat = await StockService.createExemplaires(user.id, {
      ...options,
      quantite: qty,
    });

    revalidatePath("/inventaire");
    revalidatePath("/produits");

    return { succes: true, donnees: resultat };
  } catch (err: any) {
    console.error("actionCreateExemplaires error:", err);
    return { succes: false, erreur: err.message || "Erreur lors de la création des exemplaires." };
  }
}

/**
 * Server Action : Incrément/Décrément relatif de stock (+1, -1, etc.).
 */
export async function actionAdjustStock(
  modeleId: number,
  delta: number
): Promise<{ succes: boolean; donnees?: ResultatMutationStock; erreur?: string }> {
  try {
    const user = await utilisateurCourant();
    if (!user) {
      return { succes: false, erreur: "Session expirée. Veuillez vous reconnecter." };
    }

    const resultat = await StockService.adjustStock(modeleId, delta, user.id);

    revalidatePath("/inventaire");
    revalidatePath("/produits");

    return { succes: true, donnees: resultat };
  } catch (err: any) {
    console.error("actionAdjustStock error:", err);
    return { succes: false, erreur: err.message || "Erreur lors de l'ajustement du stock." };
  }
}
