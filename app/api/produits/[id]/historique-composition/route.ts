import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

/**
 * API Historique de Composition
 *
 * GET /api/produits/[id]/historique-composition
 *
 * Retourne l'historique des opérations BOM pour un produit.
 * Supporte la pagination et le filtrage par type d'opération.
 *
 * Query params :
 *   type   → filtrer par type ("assemblage", "désassemblage", "remplacement")
 *   limit  → nombre max de résultats (défaut 20)
 *   offset → décalage pour pagination
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    return erreur(400, "Identifiant de produit invalide.");
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  try {
    const where: any = {
      OR: [
        { produit_parent_id: produitId },
        { produit_id: produitId },
      ],
    };

    if (type) {
      where.action = type;
    }

    const [historique, total] = await Promise.all([
      prisma.compositionHistorique.findMany({
        where,
        include: {
          produit: {
            select: { id: true, code_interne: true, reference: true },
          },
          produit_parent: {
            select: { id: true, code_interne: true, reference: true },
          },
          user: {
            select: { id: true, username: true },
          },
        },
        orderBy: { created_at: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.compositionHistorique.count({ where }),
    ]);

    return NextResponse.json({
      historique,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/historique-composition", e);
    return erreur(500, "Erreur lors du chargement de l'historique.");
  }
}
