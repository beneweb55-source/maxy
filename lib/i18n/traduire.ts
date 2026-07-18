import type { Dictionnaire } from "./types";

/**
 * Résout un chemin pointé (« nav.dashboard ») dans un dictionnaire imbriqué.
 * Renvoie `undefined` si le chemin n'aboutit pas à une chaîne.
 */
export function resoudre(dico: Dictionnaire, chemin: string): string | undefined {
  let courant: string | Dictionnaire | undefined = dico;
  for (const segment of chemin.split(".")) {
    if (typeof courant !== "object" || courant === null) return undefined;
    courant = courant[segment];
  }
  return typeof courant === "string" ? courant : undefined;
}

/**
 * Remplace les placeholders `{nom}` du modèle par les valeurs fournies.
 * Un placeholder sans valeur correspondante est laissé tel quel.
 */
export function interpoler(
  modele: string,
  params?: Record<string, string | number>
): string {
  if (!params) return modele;
  return modele.replace(/\{(\w+)\}/g, (_, cle: string) =>
    cle in params ? String(params[cle]) : `{${cle}}`
  );
}
