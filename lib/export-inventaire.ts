/**
 * The parameter contract of the inventory export.
 *
 * WHY THIS FILE EXISTS — a measured defect, not a precaution.
 *
 * The export used to name its file format `format`. But `format` is ALSO a
 * legitimate hardware-specification filter of the inventory screen: it is one of
 * the names in `champsMatrice` (lib/filtres-produits.ts), it is offered by
 * `FilterDrawer`, and it is counted as an active filter by `ActiveFilterBadges`
 * and by `Inventaire`. So `ModaleExport` calling `params.set("format", …)` did
 * two things at once, both wrong:
 *
 *   1. it OVERWROTE the user's hardware `format` filter, and
 *   2. it handed the file format to the product filter, which turned
 *      `format=csv_excel` into a `contains "csv_excel"` search over reference,
 *      model name and category.
 *
 * Measured on the real database: `prisma.produit.count({where})` = **0** against
 * a catalogue of **1684** products. The download succeeded, so nothing looked
 * broken — the file simply had a header row and no data. That is the whole of
 * "l'export en liste des produits ne fonctionne pas".
 *
 * The repair is not "rename the parameter and hope". `format` keeps its meaning
 * as a product filter EVERYWHERE, and the export names its own parameter
 * `format_fichier`. `construireParametresProduit` then strips the export's
 * control parameters before the filter is built — so the class of defect is
 * closed, not the single instance: a future control parameter cannot become a
 * product filter by accident, because it has to be listed here first.
 *
 * This module is pure so it can be tested without importing a route handler.
 */
import { construireFiltresProduits } from "./filtres-produits";
import type { Prisma } from "@prisma/client";

/** The export's own file-format parameter. Deliberately NOT `format`. */
export const PARAM_FORMAT_FICHIER = "format_fichier";

export const FORMATS_FICHIER = ["csv_excel", "csv_standard", "xlsx"] as const;
export type FormatFichier = (typeof FORMATS_FICHIER)[number];

export const FORMAT_FICHIER_DEFAUT: FormatFichier = "csv_excel";

/**
 * Parameters the export consumes for itself and that must never reach the
 * product filter.
 *
 * `colonnes` and `scope` happen not to collide with any filter name today, and
 * they are listed anyway: the point of the list is to be the single place where
 * a control parameter is declared, so that the next one cannot be forgotten.
 */
export const CLES_CONTROLE_EXPORT = [PARAM_FORMAT_FICHIER, "colonnes", "scope"] as const;

function estFormatFichier(valeur: string | null): valeur is FormatFichier {
  return valeur !== null && (FORMATS_FICHIER as readonly string[]).includes(valeur);
}

/**
 * The requested file format, or the default.
 *
 * An unknown value falls back to the default rather than throwing: a stale
 * bookmark or a hand-edited URL should still yield a usable file, and the format
 * is a presentation choice, not a security boundary.
 */
export function lireFormatFichier(params: URLSearchParams): FormatFichier {
  const demande = params.get(PARAM_FORMAT_FICHIER);
  return estFormatFichier(demande) ? demande : FORMAT_FICHIER_DEFAUT;
}

/**
 * The parameters to build the product filter from: everything the caller sent,
 * minus the export's control parameters.
 *
 * A copy is returned rather than mutating the input, so a caller that needs the
 * original URL (to echo it, or to log it) still has it.
 */
export function construireParametresProduit(params: URLSearchParams): URLSearchParams {
  const resultat = new URLSearchParams();
  const controle: readonly string[] = CLES_CONTROLE_EXPORT;
  for (const [cle, valeur] of params.entries()) {
    if (controle.includes(cle)) continue;
    resultat.append(cle, valeur);
  }
  return resultat;
}

/**
 * The product filter for an export.
 *
 * `scope=tous` means the whole catalogue and bypasses filtering entirely, which
 * is why it is settled before the filter is built rather than inside it.
 */
export function construireFiltresExport(params: URLSearchParams): Prisma.ProduitWhereInput {
  if (params.get("scope") === "tous") return {};
  return construireFiltresProduits(construireParametresProduit(params));
}
