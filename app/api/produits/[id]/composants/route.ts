import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";
import * as BomService from "@/lib/bom-service";

/**
 * API Produits Composés (Composants physiques)
 *
 * Utilise BomService pour toute opération d'assemblage/détachement.
 *
 * GET    /api/produits/[id]/composants → Liste les composants installés + stats
 * POST   /api/produits/[id]/composants → Attache un composant
 * PATCH  → Non supporté
 * DELETE /api/produits/[id]/composants → Détache un composant
 */

// GET : Lister les composants installés d'un produit
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    return erreur(400, "Identifiant de produit invalide.");
  }

  try {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, reference: true, est_compose: true, est_template: true },
    });

    if (!produit) {
      return erreur(404, "Produit introuvable.");
    }

    const { composants, stats } = await BomService.getComposition(prisma, produitId);

    // Historique des opérations BOM
    let historique: any[] = [];
    try {
      historique = await prisma.compositionHistorique.findMany({
        where: { produit_parent_id: produitId },
        include: {
          produit: { select: { code_interne: true, reference: true } },
          user: { select: { username: true } },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      });
    } catch {
      // Table may not exist
    }

    return NextResponse.json({
      composants: composants.map((c) => ({
        ...c,
        quantite: 1,
        bom_entry_id: c.produit_id,
      })),
      historique,
      stats: {
        ...stats,
        quantite_totale: stats.nb_composants,
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/composants", e);
    return erreur(500, "Erreur lors du chargement des composants.");
  }
}

// POST : Attacher un composant
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev", "technicien"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const parentId = Number(id);
  if (!Number.isInteger(parentId) || parentId <= 0) {
    return erreur(400, "Identifiant de produit parent invalide.");
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const composantId = Number((corps as any)?.composant_id);
  const slotDefinitionId = (corps as any)?.slot_definition_id
    ? Number((corps as any).slot_definition_id)
    : null;

  if (!Number.isInteger(composantId) || composantId <= 0) {
    return erreur(400, "Identifiant du composant invalide.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const res = await BomService.attacherComposant(tx, {
        parentId,
        composantId,
        slotDefinitionId,
        userId: user.id,
      });

      // Sync stock count
      const composant = await tx.produit.findUnique({
        where: { id: composantId },
        select: { modele_id: true },
      });
      if (composant?.modele_id) {
        await StockService.synchroniserCompteModele(composant.modele_id, tx);
      }

      return res;
    });

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("POST /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors de l'intégration du composant.");
  }
}

// PATCH : Non supporté
export async function PATCH() {
  return erreur(
    400,
    "La modification de quantité n'est plus supportée (chaque composant physique compte pour 1)."
  );
}

// DELETE : Détacher un composant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev", "technicien"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const parentId = Number(id);
  if (!Number.isInteger(parentId) || parentId <= 0) {
    return erreur(400, "Identifiant de produit parent invalide.");
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const composantId = Number((corps as any)?.composant_id);
  if (!Number.isInteger(composantId) || composantId <= 0) {
    return erreur(400, "Identifiant du composant invalide.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const res = await BomService.detacherComposant(tx, {
        parentId,
        composantId,
        userId: user.id,
        reason: "retrait",
      });

      // Sync stock count
      const composant = await tx.produit.findUnique({
        where: { id: composantId },
        select: { modele_id: true },
      });
      if (composant?.modele_id) {
        await StockService.synchroniserCompteModele(composant.modele_id, tx);
      }

      return res;
    });

    return NextResponse.json({ ok: true, message: "Composant retiré et remis en stock." });
  } catch (e: any) {
    console.error("DELETE /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors du retrait.");
  }
}
