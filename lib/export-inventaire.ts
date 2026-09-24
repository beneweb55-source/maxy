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
import { libelleStatut } from "./statuts";
import type { Prisma } from "@prisma/client";

/** The export's own file-format parameter. Deliberately NOT `format`. */
export const PARAM_FORMAT_FICHIER = "format_fichier";

export const FORMATS_FICHIER = ["csv_excel", "csv_standard", "xlsx"] as const;
export type FormatFichier = (typeof FORMATS_FICHIER)[number];

export const FORMAT_FICHIER_DEFAUT: FormatFichier = "csv_excel";

/** Le périmètre de l'export. */
export const PARAM_SCOPE = "scope";

/**
 * The scopes the export understands.
 *
 * `tous` was the old name for "the whole catalogue", and it meant it literally:
 * `construireFiltresExport` returned `{}`, so the file contained the SOLD, HS
 * and ASSEMBLED units too — 1684 rows instead of the 1616 really in stock. The
 * card that sent it advertised "Tous les articles en stock", so the screen
 * promised one thing and the file delivered another. A user who ticked it saw
 * every filter they had set evaporate, which is the heart of "le filtre de
 * l'export ne marche pas".
 *
 * The repair separates the two intentions that `tous` conflated:
 *   - `stock`     — the whole IN-STOCK catalogue (sold / HS / assembled hidden),
 *                   which is what the old label actually promised;
 *   - `selection` — exactly the units the user ticked.
 * The legacy value still resolves, to `stock`, so an old bookmark cannot keep
 * silently exporting sold goods.
 */
export const SCOPES_EXPORT = ["filtres", "stock", "selection"] as const;
export type ScopeExport = (typeof SCOPES_EXPORT)[number];

export const SCOPE_EXPORT_DEFAUT: ScopeExport = "filtres";

/** The units to export when `scope=selection`. */
export const PARAM_IDS = "ids";

/**
 * Combien d'unités une sélection exportée peut porter.
 *
 * Les ids voyagent dans la CHAÎNE DE REQUÊTE, parce que l'export est un GET
 * qu'on doit pouvoir déclencher depuis un lien. Une sélection large finit par
 * dépasser la limite d'URL du proxy — et la requête échouait alors par un 414
 * opaque, sans que rien ne dise à l'utilisateur que sa sélection était en
 * cause. Ce plafond rend la limite VISIBLE : au-delà, la modale refuse la
 * carte « sélection » et propose les filtres, qui n'ont pas de limite.
 *
 * 300 ids font environ 2 ko d'URL, très à l'abri des limites usuelles (8 ko).
 */
export const MAX_IDS_SELECTION = 300;

/**
 * Ask the route for the SIZE of the perimeter instead of the file itself:
 * `compte=1` answers `{ total }` and writes nothing.
 *
 * The modal's card « Filtres actuels uniquement » announced a number it took
 * from the screen's last loaded list, which is not the same thing as the export
 * perimeter. Measured on `?vue=famille&famille_id=16&en_vitrine=1`: the card
 * said 1616, the file would have held 57. The screen's list is paginated and
 * sometimes not loaded at all (famille/catégorie views), so no client-side
 * number can be trusted for this — only the server that builds the file's
 * `where` knows. Hence a count request, and a number that cannot disagree with
 * the download.
 */
export const PARAM_COMPTE = "compte";

/**
 * Le filtre « Exposé en vitrine » de la modale.
 *
 * C'est la clé de filtre produit STANDARD — `lib/filtres-produits.ts` la lit
 * depuis toujours — et c'est délibéré : la modale qui demande « seulement les
 * produits exposés » pose exactement la question que le tiroir de filtres de
 * l'inventaire, donc les deux ne peuvent pas diverger sur son sens. Un nom
 * dédié aurait créé une seconde définition de « en vitrine », libre de dériver.
 */
export const PARAM_VITRINE = "en_vitrine";

/**
 * « Et les exemplaires aussi » : le second sens de « en vitrine ».
 *
 * La vitrine raisonne par MODÈLE — une carte par référence exposée, portant la
 * quantité en stock (voir `app/api/vitrine/route.ts`). Les unités de ce modèle
 * qui ne portent pas `en_vitrine` sont donc absentes d'un export filtré sur
 * `en_vitrine = true`. Mesuré sur la production : 123 modèles exposés, 181
 * unités marquées, 325 exemplaires non vendus. Cette clé ouvre le choix — quand
 * elle vaut "1", le filtre vitrine retient ces exemplaires au lieu des 181
 * unités marquées, soit 322 lignes : les 3 exemplaires restants sont en `hs`
 * (les unités marquées « à jeter »), que le masquage du stock écarte déjà.
 *
 * Elle n'a de sens QU'AVEC le filtre vitrine : sans lui aucun modèle n'est
 * exposé, et il n'y a pas d'exemplaires à ajouter. `construireFiltresExport`
 * l'ignore donc dans ce cas plutôt que de retomber sur une clause vide.
 */
export const PARAM_EXEMPLAIRES = "exemplaires";

/**
 * La colonne dont la case gouverne ce filtre.
 *
 * Une même case fait donc deux choses : elle écrit la colonne dans le fichier et
 * elle restreint les lignes exportées. C'est une décision assumée, pas un effet
 * de bord oublié — elle répond au défaut mesuré (une modale annonçant
 * « 1616 articles à exporter » pour une vitrine qui en compte 181). Pour que ce
 * ne soit jamais silencieux, la modale l'annonce deux fois : une pastille
 * « filtre » sur la case, et une phrase sous les périmètres quand il est actif.
 */
export const COLONNE_FILTRE_VITRINE = "en_vitrine";

/**
 * Parameters the export consumes for itself and that must never reach the
 * product filter.
 *
 * `colonnes`, `scope` and `ids` happen not to collide with any filter name
 * today, and they are listed anyway: the point of the list is to be the single
 * place where a control parameter is declared, so that the next one cannot be
 * forgotten.
 */
export const CLES_CONTROLE_EXPORT = [
  PARAM_FORMAT_FICHIER,
  "colonnes",
  PARAM_SCOPE,
  PARAM_IDS,
  PARAM_COMPTE,
  PARAM_EXEMPLAIRES,
] as const;

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

function estScopeExport(valeur: string | null): valeur is ScopeExport {
  return valeur !== null && (SCOPES_EXPORT as readonly string[]).includes(valeur);
}

/**
 * The requested scope, or the default.
 *
 * The legacy value `tous` resolves to `stock`, not to a permissive fourth
 * scope: the card that sent it promised "tous les articles en stock", and an
 * old bookmark must not keep exporting sold goods behind the user's back.
 */
export function lireScope(params: URLSearchParams): ScopeExport {
  const demande = params.get(PARAM_SCOPE);
  if (demande === "tous") return "stock";
  return estScopeExport(demande) ? demande : SCOPE_EXPORT_DEFAUT;
}

/** The ids to export, integers only. An absent parameter yields an empty list. */
export function lireIds(params: URLSearchParams): number[] {
  const brut = params.get(PARAM_IDS);
  if (brut === null) return [];
  return brut
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/**
 * The product filter for an export.
 *
 * `scope` is settled before the filter is built rather than inside it, because
 * it decides WHICH filter applies:
 *   - `filtres`   — the caller's filters, exactly as the screen sends them;
 *   - `stock`     — the default stock view: the caller's filters dropped, but
 *                   the sold / HS / assembled mask KEPT;
 *   - `selection` — the ticked units, and nothing else.
 *
 * `stock` is built by calling the product filter with NO parameters, which is
 * exactly how the inventory screen defines its own default view — so the two
 * cannot drift apart.
 *
 * `pairesExposees` porte la réponse à « quels modèles sont exposés », que seul
 * un appelant capable d'interroger la base peut fournir. Elle n'est lue que si
 * le filtre vitrine ET le choix « exemplaires » sont demandés ; laissée vide
 * dans ce cas, elle rend une clause vide plutôt que les 181 unités marquées —
 * un export ne devine pas, il refuse.
 */
/**
 * Un modèle, tel que la vitrine le nomme : (référence, catégorie).
 *
 * C'est la clé de regroupement de `app/api/vitrine/route.ts`, reprise telle
 * quelle plutôt que réinventée — il ne doit pas exister deux définitions de
 * « le même modèle ».
 */
export interface PaireModele {
  reference: string;
  categorie: string;
}

/**
 * Les exemplaires des modèles exposés, tels que la vitrine les compte.
 *
 * Une « paire » est la clé de regroupement de la vitrine — référence et
 * catégorie — et l'ensemble des exemplaires est celui qu'une carte de vitrine
 * additionne dans sa quantité : les unités non vendues de ce modèle, exposées
 * ou non.
 *
 * Mesuré sur la production : la somme des quantités des 123 cartes vaut 325, et
 * un `where` en égalité stricte sur ces paires en rend exactement 325 — les deux
 * comptes coïncident paire par paire, la normalisation `trim().toLowerCase()` de
 * la vitrine étant sans effet sur les données réelles. L'égalité stricte est
 * donc la bonne lecture : elle ne peut pas contredire le nombre qu'une carte de
 * vitrine affiche.
 *
 * `statut: { not: "vendu" }` est délibérément MINIMAL : c'est mot pour mot la
 * définition dont la vitrine se sert pour compter sa quantité. Le reste du
 * masquage (hors-service, assemblés) appartient au périmètre, qui l'applique ou
 * non selon le scope — sur les 325 exemplaires, 3 sont en `hs` et le fichier en
 * contient donc 322. Les exclure est voulu : une unité marquée « à jeter » n'est
 * pas un exemplaire disponible. Les répéter ici créerait une seconde définition
 * du masquage, libre de diverger de `lib/filtres-produits.ts`.
 *
 * Une liste vide rend une clause qui ne peut RIEN atteindre, jamais « tout » :
 * c'est la règle de la sélection vide. Un export qui ne sait pas quels modèles
 * sont exposés doit sortir vide et le dire, pas sortir le catalogue.
 */
export function construireFiltresExemplaires(paires: PaireModele[]): Prisma.ProduitWhereInput {
  if (paires.length === 0) return { id: { in: [] } };
  return {
    // « Exemplaire » au sens de la vitrine : une unité encore en stock. La carte
    // annonce sa quantité ainsi, un vendu n'en fait donc pas partie.
    statut: { not: "vendu" },
    OR: paires.map((p) => ({ reference: p.reference, categorie: p.categorie })),
  };
}

export function construireFiltresExport(
  params: URLSearchParams,
  pairesExposees: PaireModele[] = []
): Prisma.ProduitWhereInput {
  // Les exemplaires des modèles exposés, et non les unités marquées : c'est un
  // second SENS du filtre, décidé une fois ici pour que le périmètre et la
  // clause posée plus bas ne puissent pas se contredire.
  const parModeles =
    params.get(PARAM_VITRINE) === "1" && params.get(PARAM_EXEMPLAIRES) === "1";

  const perimetre = ((): Prisma.ProduitWhereInput => {
    switch (lireScope(params)) {
      case "stock":
        return construireFiltresProduits(new URLSearchParams());
      case "selection":
        // An empty selection yields an unmatchable clause rather than the whole
        // catalogue: "j'ai coché zéro ligne" must never mean "donne-moi tout".
        return { id: { in: lireIds(params) } };
      default: {
        const filtres = construireParametresProduit(params);
        // Piège mesuré : pour le périmètre « filtres », les paramètres de
        // l'écran atteignent AUSSI `construireFiltresProduits`, où `en_vitrine`
        // veut dire « unité marquée ». Une URL d'écran portant déjà
        // `en_vitrine=1` aurait alors croisé les 325 exemplaires avec les 181
        // unités marquées, et rendu 181 — le choix aurait été sans effet, sans
        // que rien ne le dise. Quand on demande les exemplaires, c'est la clause
        // de modèle, et elle seule, qui décide de la vitrine.
        if (parModeles) filtres.delete(PARAM_VITRINE);
        return construireFiltresProduits(filtres);
      }
    }
  })();

  // « Exposé en vitrine » se pose APRÈS le périmètre et vaut pour TOUS les
  // périmètres. C'est nécessaire, pas décoratif : `stock` et `selection`
  // écartent volontairement les paramètres de l'écran, si bien qu'un filtre lu
  // par `construireFiltresProduits` y serait purement perdu — la case cochée
  // n'aurait alors rien filtré dès qu'on change de périmètre, exactement le
  // genre d'incohérence qu'on cherche à fermer ici. La clause est identique à
  // celle du filtre d'écran, donc « en vitrine » n'a qu'une définition.
  if (params.get(PARAM_VITRINE) === "1") {
    // Le choix « et les exemplaires aussi » remplace la clause d'unité marquée
    // par celles des modèles exposés. `pairesExposees` vient de l'appelant, qui
    // seul peut interroger la base : cette fonction reste pure et synchrone.
    if (params.get(PARAM_EXEMPLAIRES) === "1") {
      return { AND: [perimetre, construireFiltresExemplaires(pairesExposees)] };
    }
    return { AND: [perimetre, { en_vitrine: true }] };
  }

  return perimetre;
}

// ---------------------------------------------------------------------------
// The columns
// ---------------------------------------------------------------------------

export interface ColonneExport {
  label: string;
  extracteur: (p: any) => any;
}

/**
 * Every column the export can emit, in the order used when the caller asks for
 * none in particular (`Object.keys` preserves this insertion order).
 *
 * This map lives here rather than in the route so the whole column surface can
 * be exercised without importing a route handler — see the test of the same name.
 * It moved unchanged; `app/api/produits/export/route.ts` now imports it.
 */
export const MAP_COLONNES: Record<string, ColonneExport> = {
  code_interne: {
    label: "Code Interne",
    extracteur: (p) => p.code_interne,
  },
  reference: {
    label: "Désignation / Modèle",
    extracteur: (p) => p.reference,
  },
  categorie: {
    label: "Catégorie",
    extracteur: (p) => p.categorie,
  },
  statut: {
    label: "Statut",
    extracteur: (p) => libelleStatut(p.statut),
  },
  en_vitrine: {
    label: "En Vitrine",
    extracteur: (p) => (p.en_vitrine ? "Oui" : "Non"),
  },
  numero_serie: {
    label: "Numéro de Série (S/N)",
    extracteur: (p) => p.numero_serie || "—",
  },
  grade: {
    label: "Grade / État",
    extracteur: (p) => p.grade || "Grade A",
  },
  emplacement: {
    label: "Emplacement",
    extracteur: (p) => p.emplacement || "reserve",
  },
  prix_achat: {
    label: "Prix d'Achat (DA)",
    extracteur: (p) => p.prix_achat,
  },
  prix_vente_fixe: {
    label: "Prix de Vente Conseillé (DA)",
    extracteur: (p) => p.prix_vente_fixe ?? "—",
  },
  marge_estimee: {
    label: "Marge Estimée (DA)",
    // `prix_achat` is tested for TRUTHINESS on purpose: a zero purchase price is
    // not a divisor, and `(pv - 0) / 0` would print "Infinity%".
    extracteur: (p) =>
      p.prix_vente_fixe && p.prix_achat
        ? `${p.prix_vente_fixe - p.prix_achat} DA (${Math.round(((p.prix_vente_fixe - p.prix_achat) / p.prix_achat) * 100)}%)`
        : "—",
  },
  reparations: {
    label: "Frais Réparations (DA)",
    extracteur: (p) => p.reparations?.reduce((acc: number, r: any) => acc + (r.cout || 0), 0) || 0,
  },
  prix_vente_reel: {
    label: "Prix Vente Réel (DA)",
    extracteur: (p) => p.prix_vente_reel ?? "—",
  },
  date_vente: {
    label: "Date de Vente",
    extracteur: (p) => (p.date_vente ? jourIso(p.date_vente) : "—"),
  },
  lot_id: {
    label: "N° Arrivage / Lot",
    extracteur: (p) => (p.lot ? `Lot #${p.lot.id}` : "Sans arrivage"),
  },
  fournisseur: {
    label: "Fournisseur",
    extracteur: (p) => p.lot?.fournisseur || "—",
  },
  date_entree: {
    label: "Date d'Entrée",
    extracteur: (p) => jourIso(p.lot?.date_entree || p.created_at),
  },
  notes: {
    label: "Notes",
    extracteur: (p) => p.notes || "",
  },
};

/** The keys, in the order the route emits them when none are requested. */
export const COLONNES_EXPORT_DEFAUT: string[] = Object.keys(MAP_COLONNES);

/** A currency cell: displayed as money, stored as a real number. */
export const FORMAT_MONNAIE = '#,##0" DA"';

export type CategorieColonneExport =
  | "identification"
  | "technique"
  | "financier"
  | "logistique";

/**
 * What the modal needs to know about a column, and how the xlsx writer should
 * lay it out. The IDs are not repeated here: they come from `MAP_COLONNES`,
 * which owns them.
 *
 * WHY THIS EXISTS — the modal used to keep its own catalogue, with its own
 * labels and its own defaults, over the same id space. A column added to one and
 * not the other was either invisible in the modal, or requested by it and
 * silently dropped by the route. Both lists are now derived from the same map,
 * so that drift is no longer expressible.
 */
export const META_COLONNES: Record<
  string,
  {
    labelModale: string;
    categorie: CategorieColonneExport;
    defaut: boolean;
    largeur: number;
    monnaie?: boolean;
  }
> = {
  code_interne: { labelModale: "Code Interne (P-XXXX)", categorie: "identification", defaut: true, largeur: 16 },
  // 67 = le 90ᵉ centile des désignations réelles, mesuré sur les 1684 lignes de
  // production (p50 = 30, p75 = 43, p90 = 67, p95 = 78). L'ancienne largeur de 34
  // coupait 632 d'entre elles — 37 % du catalogue, dont la moyenne fait pourtant
  // 34 caractères : la médiane et la moyenne mentaient sur la queue de
  // distribution. 67 laisse donc 9 noms sur 10 se lire en entier, et la colonne
  // reste la plus large du fichier (le test « la désignation est la colonne la
  // plus large » tient cet invariant).
  //
  // Le reste de la queue est hors d'atteinte : 55 désignations dépassent 80
  // caractères et la plus longue en fait 358 — une colonne assez large pour
  // celle-là rendrait le tableau inutilisable, on préfère la laisser se couper.
  reference: { labelModale: "Désignation / Modèle", categorie: "identification", defaut: true, largeur: 67 },
  categorie: { labelModale: "Catégorie", categorie: "identification", defaut: true, largeur: 28 },
  statut: { labelModale: "Statut (En vente, Reçu, etc.)", categorie: "identification", defaut: true, largeur: 18 },
  en_vitrine: { labelModale: "Exposé en Vitrine", categorie: "identification", defaut: false, largeur: 12 },
  numero_serie: { labelModale: "Numéro de Série (S/N)", categorie: "technique", defaut: true, largeur: 22 },
  grade: { labelModale: "Grade / État cosmétique", categorie: "technique", defaut: true, largeur: 14 },
  emplacement: { labelModale: "Emplacement (Réserve/Vitrine)", categorie: "technique", defaut: true, largeur: 15 },
  notes: { labelModale: "Notes & Commentaires", categorie: "technique", defaut: false, largeur: 30 },
  prix_achat: { labelModale: "Prix d'Achat (DA)", categorie: "financier", defaut: true, largeur: 18, monnaie: true },
  prix_vente_fixe: { labelModale: "Prix de Vente Fixé (DA)", categorie: "financier", defaut: true, largeur: 26, monnaie: true },
  marge_estimee: { labelModale: "Marge Brute Estimée (DA & %)", categorie: "financier", defaut: false, largeur: 24 },
  reparations: { labelModale: "Frais de Réparations (DA)", categorie: "financier", defaut: false, largeur: 20, monnaie: true },
  prix_vente_reel: { labelModale: "Prix Vente Réel (si vendu)", categorie: "financier", defaut: false, largeur: 20, monnaie: true },
  date_vente: { labelModale: "Date de Vente", categorie: "financier", defaut: false, largeur: 14 },
  lot_id: { labelModale: "N° Lot / Arrivage", categorie: "logistique", defaut: true, largeur: 16 },
  fournisseur: { labelModale: "Fournisseur", categorie: "logistique", defaut: true, largeur: 20 },
  date_entree: { labelModale: "Date d'Entrée en Stock", categorie: "logistique", defaut: true, largeur: 16 },
};

/** The modal's checkbox catalogue, derived from the columns that really exist. */
export interface ColonneModale {
  id: string;
  label: string;
  categorie: CategorieColonneExport;
  defaut: boolean;
}

export const COLONNES_DISPONIBLES: ColonneModale[] = Object.keys(MAP_COLONNES).map((id) => {
  const meta: (typeof META_COLONNES)[string] | undefined = META_COLONNES[id];
  return {
    id,
    label: meta?.labelModale ?? MAP_COLONNES[id]!.label,
    categorie: meta?.categorie ?? "technique",
    defaut: meta?.defaut ?? false,
  };
});

/** The widths for `!cols`, aligned with the keys actually emitted. */
export function largeursColonnes(colonnesCles: string[]): { wch: number }[] {
  return colonnesCles.map((k) => ({ wch: META_COLONNES[k]?.largeur ?? 18 }));
}

/** The positions, among the emitted columns, that hold a currency amount. */
export function colonnesMonnaie(colonnesCles: string[]): number[] {
  return colonnesCles
    .map((k, i) => (META_COLONNES[k]?.monnaie ? i : -1))
    .filter((i) => i >= 0);
}

/**
 * Ready-made column sets, rendered by the modal.
 *
 * Their ids go through `lireColonnes`, which drops anything unknown — so a stale
 * preset can only ever yield fewer columns, never a broken file.
 */
export const PRESETS_COLONNES: {
  id: string;
  label: string;
  emoji: string;
  colonnes: string[];
}[] = [
  {
    id: "pos",
    label: "Standard POS",
    emoji: "🧾",
    colonnes: ["code_interne", "reference", "categorie", "statut", "prix_vente_fixe", "numero_serie", "grade", "emplacement"],
  },
  {
    id: "compta",
    label: "Comptabilité & Marge",
    emoji: "💼",
    colonnes: ["code_interne", "reference", "lot_id", "fournisseur", "date_entree", "prix_achat", "reparations", "prix_vente_fixe", "marge_estimee"],
  },
  {
    id: "public",
    label: "Public (sans prix d'achat)",
    emoji: "👁",
    colonnes: ["reference", "categorie", "prix_vente_fixe", "grade", "numero_serie", "emplacement", "en_vitrine"],
  },
  {
    id: "vitrine",
    label: "Vitrine & étiquettes",
    emoji: "🏷",
    colonnes: ["code_interne", "reference", "categorie", "prix_vente_fixe", "grade", "emplacement", "en_vitrine"],
  },
  {
    id: "sav",
    label: "SAV & Réparations",
    emoji: "🔧",
    colonnes: ["code_interne", "reference", "statut", "grade", "reparations", "prix_achat", "prix_vente_fixe", "notes", "date_entree"],
  },
];

/**
 * A date as `AAAA-MM-JJ`, and never a thrown `RangeError`.
 *
 * `new Date(x).toISOString()` throws on an unparseable value, which would turn
 * one malformed row into a 500 for the whole export. A cell reading `—` is a
 * visible, survivable outcome; a failed export is not.
 */
function jourIso(valeur: unknown): string {
  const d = new Date(valeur as any);
  return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}

/**
 * The requested columns, filtered to the ones that exist.
 *
 * An unknown key is dropped rather than throwing: the request comes from a form
 * whose checkbox list is the source of truth, and a stale bookmark asking for a
 * column that no longer exists should still produce a file.
 *
 * When the parameter is absent, every column is emitted. When it is present but
 * names nothing valid, the result is EMPTY — the caller asked for a specific set
 * and got none of it, which must be visible rather than silently widened to all.
 */
export function lireColonnes(params: URLSearchParams): string[] {
  const demande = params.get("colonnes");
  if (demande === null) return COLONNES_EXPORT_DEFAUT;
  return demande.split(",").filter((k) => MAP_COLONNES[k]);
}

// ---------------------------------------------------------------------------
// Serialisation
// ---------------------------------------------------------------------------

/** One CSV cell: quoted only when it would otherwise break the line. */
export function champCsv(valeur: any, separateur = ";"): string {
  if (valeur === null || valeur === undefined) return "";
  const texte = String(valeur);
  const regex = new RegExp(`[${separateur}"\n\r]`);
  return regex.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export interface TableauExport {
  /** The column labels, in order. */
  entetes: string[];
  /** The rows, each aligned with `entetes`. */
  lignes: any[][];
  /** The same rows keyed by label, for the xlsx writer. */
  objets: Record<string, any>[];
  /** Which keys were requested. */
  colonnesCles: string[];
}

/**
 * Turn products into rows, once, for both the CSV and the xlsx writers.
 *
 * A single builder keeps the two formats from drifting: before this, the xlsx
 * path and the CSV path each walked `colonnesCles` separately, so a change to one
 * could silently miss the other.
 */
export function construireTableau(produits: any[], colonnesCles: string[]): TableauExport {
  const valides = colonnesCles.filter((k) => MAP_COLONNES[k]);
  const entetes = valides.map((k) => MAP_COLONNES[k]!.label);

  return {
    entetes,
    colonnesCles: valides,
    lignes: produits.map((p) => valides.map((k) => MAP_COLONNES[k]!.extracteur(p))),
    objets: produits.map((p) => {
      const row: Record<string, any> = {};
      for (const k of valides) row[MAP_COLONNES[k]!.label] = MAP_COLONNES[k]!.extracteur(p);
      return row;
    }),
  };
}

/**
 * The CSV body, BOM included so Excel reads UTF-8 accents correctly.
 *
 * CRLF because Excel on Windows expects it; the BOM because without it Excel
 * renders "Catégorie" as "CatÃ©gorie".
 */
export function serialiserCsv(tableau: TableauExport, separateur: string): string {
  const corps = tableau.lignes.map((ligne) =>
    ligne.map((cellule) => champCsv(cellule, separateur)).join(separateur)
  );
  return "﻿" + [tableau.entetes.join(separateur), ...corps].join("\r\n");
}

/** The separator for a format: only `csv_standard` uses a comma. */
export function separateurPour(format: FormatFichier): string {
  return format === "csv_standard" ? "," : ";";
}
