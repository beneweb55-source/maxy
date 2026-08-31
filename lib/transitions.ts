import type { StatutProduit } from "@prisma/client";
import { libelleStatut } from "./statuts";

export const TRANSITIONS_MANUELLES: Partial<Record<StatutProduit, readonly StatutProduit[]>> = {
  recu: ["en_test"],
  en_test: ["ok", "a_reparer", "manque_piece", "hs"],
  manque_piece: ["a_reparer"],
  a_reparer: ["ok"],
};

export const STATUTS_NOTE_OBLIGATOIRE: readonly StatutProduit[] = [
  "a_reparer",
  "manque_piece",
  "hs",
];

export const PLACEHOLDERS_NOTE: Partial<Record<StatutProduit, string>> = {
  a_reparer: "Décrivez le défaut à réparer (obligatoire)",
  manque_piece: "Précisez la pièce manquante (obligatoire)",
  hs: "Expliquez pourquoi le produit est HS (obligatoire)",
};

export function transitionAutorisee(avant: StatutProduit, apres: StatutProduit): boolean {
  return (TRANSITIONS_MANUELLES[avant] ?? []).includes(apres);
}

export function messageTransitionInvalide(avant: StatutProduit, apres: StatutProduit): string {
  if (avant === "vendu") {
    return "Produit vendu : verrouillé, aucune modification possible (sauf notes).";
  }
  if (apres === "en_vente") {
    return "Le passage en vente se fait uniquement en fixant un prix (gérant).";
  }
  if (apres === "produit_commande") {
    return "Le passage en produit commandé se fait automatiquement via une commande ou réservation.";
  }
  if (apres === "vendu") {
    return "Le passage en vendu se fait uniquement en enregistrant une vente.";
  }
  const possibles = TRANSITIONS_MANUELLES[avant] ?? [];
  const suffixe =
    possibles.length > 0
      ? ` Transitions possibles : ${possibles.map(libelleStatut).join(", ")}.`
      : " Aucune transition manuelle possible depuis ce statut.";
  return `Transition interdite : ${libelleStatut(avant)} → ${libelleStatut(apres)}.${suffixe}`;
}
