import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

/**
 * GET /api/produits/composants/disponibles
 * Recherche de composants disponibles pour intégration BOM.
 * Filtre : statut NOT IN [vendu, hs, assemble] ET parent_id = null.
 *
 * Query params :
 *   q          → recherche texte (code_interne, reference, numero_serie)
 *   categorie_id → filtrer par catégorie
 *   modele_id  → filtrer par modèle
 *   page       → numéro de page (défaut 1)
 *   limit      → résultats par page (défaut 20)
 */

export async function GET(request: Request) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const categorieId = searchParams.get("categorie_id");
  const modeleId = searchParams.get("modele_id");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const skip = (page - 1) * limit;

  try {
    // Statuts qui retirent le produit du stock disponible
    const STATUTS_NON_DISPONIBLES = ["vendu", "hs", "assemble"];

    const where: any = {
      statut: { notIn: STATUTS_NON_DISPONIBLES },
      parent_id: null,
    };

    if (q) {
      where.OR = [
        { code_interne: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { numero_serie: { contains: q, mode: "insensitive" } },
      ];
    }

    if (categorieId) {
      where.categorie_id = Number(categorieId);
    }

    if (modeleId) {
      where.modele_id = Number(modeleId);
    }

    const [produits, total] = await Promise.all([
      prisma.produit.findMany({
        where,
        select: {
          id: true,
          code_interne: true,
          reference: true,
          categorie: true,
          numero_serie: true,
          grade: true,
          statut: true,
          prix_achat: true,
          image_url: true,
          modele: { select: { id: true, nom: true, categorie_id: true } },
        },
        orderBy: [{ reference: "asc" }, { id: "asc" }],
        skip,
        take: limit,
      }),
      prisma.produit.count({ where }),
    ]);

    return NextResponse.json({
      produits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    console.error("GET /api/produits/composants/disponibles", e);
    return erreur(500, "Erreur lors de la recherche de composants disponibles.");
  }
}
