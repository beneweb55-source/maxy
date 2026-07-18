// Types de base de l'internationalisation. La `Langue` reprend volontairement
// les mêmes valeurs que l'enum Prisma `Langue` (fr / en) : les deux unions sont
// structurellement identiques et assignables sans conversion.

export type Langue = "fr" | "en";

export const LANGUES: readonly Langue[] = ["fr", "en"];

export function estLangue(valeur: unknown): valeur is Langue {
  return valeur === "fr" || valeur === "en";
}

/** Dictionnaire de traductions imbriqué (valeurs = chaînes avec placeholders `{x}`). */
export interface Dictionnaire {
  [cle: string]: string | Dictionnaire;
}
