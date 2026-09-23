import type { Prisma, StatutProduit } from "@prisma/client";
import { STATUTS_PRODUIT, STATUTS_DEFAUT } from "./statuts";
import { decodeBase64Url } from "./base64url";

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Les clés de spécification que le serveur lit RÉELLEMENT.
 *
 * SOURCE DE VÉRITÉ UNIQUE, et non une liste parmi d'autres : `FilterDrawer`
 * rend les attributs de la matrice métier marqués `filtre: true`, mais dix
 * d'entre eux ne figurent pas ici — `cpu_gamme`, `cpu_generation`, `ram_taille`,
 * `stockage_principal`, `taille_ecran_aio`, `clavier_layout`,
 * `generation_serveur`, `taille_ecran_pos`, `cpu_modele`, `fonctions`. La
 * pastille s'allumait, la liste ne bougeait pas, aucun badge ne s'affichait et
 * l'export ne les voyait pas : c'est le gros de « des filtres ne marchent pas ».
 *
 * Mesuré avant de décider : cinq de ces clés ne ramèneraient AUCUNE ligne, et
 * quatre ramèneraient du bruit (`ram_taille` → 610 lignes pour un simple
 * `contains "8"`, `taille_ecran_pos` → 480). Les câbler serait donc pire que
 * les ignorer, puisqu'elles auraient l'air de fonctionner. Le tiroir s'appuie
 * sur cette liste pour n'afficher que des facettes qui agissent vraiment.
 */
export const CHAMPS_MATRICE_FILTRES = [
  "marque", "format", "cpu", "ram", "stockage", "format_cible", "type_specifique",
  "generation", "frequence_mhz", "type_disque", "interface", "format_physique",
  "capacite", "capacite_disque", "taille_ecran", "taille_pouces", "resolution",
  "frequence_hz", "type_dalle", "puissance_w", "type_connecteur", "fondeur",
  "gamme", "vram_taille", "type_consommable", "couleur", "technologie", "format_serveur",
] as const;

export function construireFiltresProduits(
  params: URLSearchParams,
  options?: { ignorerStatuts?: boolean }
): Prisma.ProduitWhereInput {
  const clauses: Prisma.ProduitWhereInput[] = [];

  const q = params.get("q")?.trim();
  if (q) {
    clauses.push({
      OR: [
        { reference: { contains: q, mode: "insensitive" } },
        { code_interne: { contains: q, mode: "insensitive" } },
        { numero_serie: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { categorie: { contains: q, mode: "insensitive" } },
        { categorie_rel: { nom: { contains: q, mode: "insensitive" } } },
        { modele: { nom: { contains: q, mode: "insensitive" } } },
      ],
    });
  }

  const referenceExacte = params.get("reference_exacte");
  if (referenceExacte) {
    clauses.push({ reference: referenceExacte });
  }

  const codeExact = params.get("code_exact");
  if (codeExact) {
    clauses.push({
      OR: [
        { code_interne: { equals: codeExact, mode: "insensitive" } },
        { numero_serie: { equals: codeExact, mode: "insensitive" } },
      ],
    });
  }

  const gradeParam = params.get("grade") || params.get("grades");
  if (gradeParam) {
    const grades = gradeParam.split(",").map((g) => g.trim()).filter(Boolean);
    if (grades.length > 0) {
      clauses.push({ grade: { in: grades } });
    }
  }

  const emplacement = params.get("emplacement")?.trim();
  if (emplacement) {
    if (emplacement === "vitrine") {
      clauses.push({ OR: [{ emplacement: "vitrine" }, { en_vitrine: true }] });
    } else if (emplacement === "reserve") {
      clauses.push({ emplacement: "reserve" });
    } else {
      clauses.push({ emplacement });
    }
  }

  // Filtres de spécifications matérielles adaptatives (Matrice Unifiée)
  for (const cle of CHAMPS_MATRICE_FILTRES) {
    const val = params.get(cle)?.trim();
    if (val) {
      // Nettoyer les suffixes comme "Go", "W", "Hz", "pouces" pour une recherche large et précise
      const valPure = val.replace(/Go|GB|W|Hz|pouces|"/g, "").trim();
      clauses.push({
        OR: [
          { reference: { contains: val, mode: "insensitive" } },
          { reference: { contains: valPure, mode: "insensitive" } },
          { modele: { nom: { contains: val, mode: "insensitive" } } },
          { modele: { nom: { contains: valPure, mode: "insensitive" } } },
          { categorie: { contains: val, mode: "insensitive" } },
          { categorie_rel: { nom: { contains: val, mode: "insensitive" } } },
        ],
      });
    }
  }

  const cle = params.get("cle");
  if (cle) {
    try {
      const decoded = decodeBase64Url(cle);
      const lastPipeIndex = decoded.lastIndexOf("|");
      if (lastPipeIndex !== -1) {
        const reference = decoded.substring(0, lastPipeIndex);
        const categorieCle = decoded.substring(lastPipeIndex + 1);
        if (reference && categorieCle) {
          clauses.push({ reference, categorie: categorieCle });
        }
      }
    } catch (e) {
      console.warn("Invalid cle format", e);
    }
  }

  if (!options?.ignorerStatuts) {
    // « À jeter » est un sous-ensemble de `hs`. Quand il est demandé, `hs` ne
    // peut plus être masqué par défaut : les deux clauses se contredisaient et
    // le filtre ne rendait jamais rien — mesuré à 0 ligne alors que 3 produits
    // portent réellement le drapeau, tous en statut `hs`.
    const statutsMasques: StatutProduit[] =
      params.get("a_jeter") === "1" ? ["vendu", "assemble"] : ["vendu", "hs", "assemble"];

    const statutsBruts = params.get("statuts");
    const statuts = (statutsBruts ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is StatutProduit => (STATUTS_PRODUIT as readonly string[]).includes(s));

    if (statuts.length > 0) {
      clauses.push({ statut: { in: statuts } });
    } else if (statutsBruts !== null && statutsBruts.trim() !== "") {
      // Le paramètre est présent et ne nomme AUCUN statut connu : l'appelant a
      // demandé quelque chose qu'on ne peut pas lui donner. Retomber sur le
      // masquage par défaut faisait passer une faute de frappe pour un résultat
      // légitime — la liste semblait filtrée alors qu'elle ne l'était pas.
      clauses.push({ statut: { in: [] } });
    } else {
      // Si aucun statut spécifique n'est demandé, on masque les vendus, jetés
      // et composants assemblés par défaut
      clauses.push({ statut: { notIn: statutsMasques } });
    }
  }

  const familleId = Number(params.get("famille_id"));
  if (Number.isInteger(familleId) && familleId > 0) {
    clauses.push({
      OR: [
        { categorie_id: familleId },
        { categorie_rel: { parent_id: familleId } },
        { categorie_rel: { parent: { parent_id: familleId } } },
      ],
    });
  }

  const catRelId = Number(params.get("categorie_id"));
  if (Number.isInteger(catRelId) && catRelId > 0) {
    clauses.push({
      OR: [
        { categorie_id: catRelId },
        { categorie_rel: { parent_id: catRelId } },
      ],
    });
  }

  const sousCatId = Number(params.get("sous_categorie_id"));
  if (Number.isInteger(sousCatId) && sousCatId > 0) {
    clauses.push({ categorie_id: sousCatId });
  }

  const modeleId = Number(params.get("modele_id"));
  if (Number.isInteger(modeleId) && modeleId > 0) {
    clauses.push({ modele_id: modeleId });
  }

  const categorie = params.get("categorie")?.trim();
  if (categorie) clauses.push({ categorie });

  const lotId = Number(params.get("lot"));
  if (Number.isInteger(lotId) && lotId > 0) clauses.push({ lot_id: lotId });

  // Produits ajoutés directement à l'inventaire, sans rattachement à un lot.
  if (params.get("sans_lot") === "1") clauses.push({ lot_id: null });

  const du = params.get("du");
  const au = params.get("au");
  const dateEntree: Prisma.DateTimeFilter = {};
  if (du && !Number.isNaN(Date.parse(du))) dateEntree.gte = new Date(du);
  if (au && !Number.isNaN(Date.parse(au))) {
    dateEntree.lt = new Date(new Date(au).getTime() + JOUR_MS);
  }
  // Date d'entrée = date du lot si présent, sinon date de création du produit.
  if (dateEntree.gte || dateEntree.lt) {
    clauses.push({
      OR: [{ lot: { date_entree: dateEntree } }, { lot_id: null, created_at: dateEntree }],
    });
  }

  if (params.get("plus30j") === "1") {
    const seuil = new Date(Date.now() - 30 * JOUR_MS);
    clauses.push({
      statut: { not: "vendu" },
      OR: [
        { lot: { date_entree: { lt: seuil } } },
        { lot_id: null, created_at: { lt: seuil } },
      ],
    });
  }

  if (params.get("a_tarifer") === "1") {
    clauses.push({
      prix_vente_fixe: null,
      statut: { notIn: ["vendu", ...STATUTS_DEFAUT] },
    });
  }

  if (params.get("a_classer") === "1") {
    clauses.push({
      categorie_id: null,
    });
  }

  if (params.get("a_jeter") === "1") {
    // Le masquage de `hs` a été levé plus haut (bloc `statuts`) pour que cette
    // clause puisse aboutir.
    clauses.push({ statut: "hs", a_jeter: true });
  }

  if (params.get("en_vitrine") === "1") {
    clauses.push({ en_vitrine: true });
  }

  if (params.get("poste_reseaux") === "1") {
    clauses.push({ poste_reseaux: true });
  }

  if (params.get("sans_photo") === "1") {
    // image_url is null and no images in relation
    clauses.push({
      image_url: null,
      images: { none: {} }
    });
  }

  if (params.get("sans_etiquette") === "1") {
    clauses.push({ etiquette_imprimee: false });
  }

  return clauses.length > 0 ? { AND: clauses } : {};
}

export function construireTriProduits(
  params: URLSearchParams
): Prisma.ProduitOrderByWithRelationInput {
  const ordre = params.get("ordre") === "desc" ? "desc" : "asc";
  switch (params.get("tri")) {
    case "reference":
      return { reference: ordre };
    case "categorie":
      return { categorie: ordre };
    case "statut":
      return { statut: ordre };
    case "prix_achat":
      return { prix_achat: ordre };
    case "prix_vente_fixe":
      return { prix_vente_fixe: ordre };
    case "date_entree":
      // On trie sur created_at (propre au produit, rétro-rempli comme date
      // d'entrée) : cohérent pour tous les produits, y compris ceux sans lot,
      // contrairement à lot.date_entree qui classerait les sans-lot en NULLS.
      return { created_at: ordre };
    default:
      return { code_interne: ordre };
  }
}
