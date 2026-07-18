// Journal des mises à jour de l'application, affiché dans la section « Updates »
// de l'administration. Pour annoncer une nouvelle update : ajoutez une entrée
// EN TÊTE du tableau (la plus récente en premier). La date doit inclure le jour
// et l'heure au format ISO local, ex. "2026-07-18T17:33:00".

export interface MiseAJour {
  /** Date + heure de la mise à jour, au format ISO local (jour et heure). */
  date: string;
  /** Titre court de l'update. */
  titre: string;
  /** Détails optionnels, listés à puces sous le titre. */
  details?: string[];
}

export const MISES_A_JOUR: MiseAJour[] = [
  {
    date: "2026-07-18T17:35:00",
    titre: "Nouvelle section « Updates »",
    details: [
      "Journal des mises à jour affiché ici, avec le jour et l'heure de chaque livraison.",
    ],
  },
  {
    date: "2026-07-18T17:33:00",
    titre: "Rapport de lot amélioré",
    details: [
      "Les produits identiques sont regroupés en une ligne avec leur quantité (nombre d'exemplaires).",
      "Affichage du prix de vente unitaire pour chaque produit.",
    ],
  },
  {
    date: "2026-07-18T17:33:00",
    titre: "Formulaire de modification épuré",
    details: ["Suppression de l'arrière-plan flou sombre derrière les fenêtres."],
  },
  {
    date: "2026-07-18T17:33:00",
    titre: "Prise de photo adaptée au support",
    details: [
      "La prise de photo est masquée sur ordinateur (desktop) ; l'import depuis la galerie reste disponible partout.",
    ],
  },
];
