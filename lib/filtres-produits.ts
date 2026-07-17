import type { Prisma, StatutProduit } from "@prisma/client";
import { STATUTS_PRODUIT } from "./statuts";

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

  const statuts = (params.get("statuts") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StatutProduit => (STATUTS_PRODUIT as readonly string[]).includes(s));
  if (statuts.length > 0) clauses.push({ statut: { in: statuts } });

  const categorie = params.get("categorie")?.trim();
  if (categorie) clauses.push({ categorie });

  const lotId = Number(params.get("lot"));
  if (Number.isInteger(lotId) && lotId > 0) clauses.push({ lot_id: lotId });

  const du = params.get("du");
  const au = params.get("au");
  const dateEntree: Prisma.DateTimeFilter = {};
  if (du && !Number.isNaN(Date.parse(du))) dateEntree.gte = new Date(du);
  if (au && !Number.isNaN(Date.parse(au))) {
    dateEntree.lt = new Date(new Date(au).getTime() + JOUR_MS);
  }
  if (dateEntree.gte || dateEntree.lt) clauses.push({ lot: { date_entree: dateEntree } });

  if (params.get("plus30j") === "1") {
    clauses.push({
      statut: { not: "vendu" },
      lot: { date_entree: { lt: new Date(Date.now() - 30 * JOUR_MS) } },
    });
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
      return { lot: { date_entree: ordre } };
    default:
      return { code_interne: ordre };
  }
}
