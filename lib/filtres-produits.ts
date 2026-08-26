import type { Prisma, StatutProduit } from "@prisma/client";
import { STATUTS_PRODUIT, STATUTS_DEFAUT } from "./statuts";

const JOUR_MS = 24 * 60 * 60 * 1000;

export function construireFiltresProduits(params: URLSearchParams): Prisma.ProduitWhereInput {
  const clauses: Prisma.ProduitWhereInput[] = [];

  const q = params.get("q")?.trim();
  if (q) {
    clauses.push({
      OR: [
        { reference: { contains: q, mode: "insensitive" } },
        { code_interne: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const referenceExacte = params.get("reference_exacte");
  if (referenceExacte) {
    clauses.push({ reference: referenceExacte });
  }

  const statuts = (params.get("statuts") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StatutProduit => (STATUTS_PRODUIT as readonly string[]).includes(s));
  if (statuts.length > 0) {
    clauses.push({ statut: { in: statuts } });
  } else {
    // Si aucun statut spécifique n'est demandé, on masque les vendus par défaut
    clauses.push({ statut: { not: "vendu" } });
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

  if (params.get("a_jeter") === "1") {
    clauses.push({ statut: "hs", a_jeter: true });
  }

  if (params.get("en_vitrine") === "1") {
    clauses.push({ en_vitrine: true });
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
