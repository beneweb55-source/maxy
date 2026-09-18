import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";

/**
 * GET    /api/credits/[id] — Détail d'un crédit
 * PATCH  /api/credits/[id] — Modifier échéance / notes
 * DELETE /api/credits/[id] — Supprimer un crédit
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const creditId = Number(id);
  if (!Number.isInteger(creditId) || creditId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const credit = await prisma.venteCredit.findUnique({
      where: { id: creditId },
      include: {
        client: {
          select: { id: true, nom: true, telephone: true, email: true, adresse: true },
        },
        vente: {
          select: {
            id: true,
            prix_vente_reel: true,
            date_vente: true,
            type_vente: true,
            canal: true,
            produit: {
              select: { code_interne: true, reference: true, categorie: true, image_url: true },
            },
          },
        },
        paiements: {
          orderBy: { date_paiement: "desc" },
          include: {
            user: { select: { username: true } },
          },
        },
      },
    });

    if (!credit) return erreur(404, "Crédit introuvable.");
    return NextResponse.json(credit);
  } catch (e) {
    console.error("GET /api/credits/[id]", e);
    return erreur(500, "Erreur lors du chargement du crédit.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const creditId = Number(id);
  if (!Number.isInteger(creditId) || creditId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const body = await request.json();
    const { date_echeance, notes } = body;

    const credit = await prisma.venteCredit.findUnique({
      where: { id: creditId },
      select: { id: true },
    });
    if (!credit) return erreur(404, "Crédit introuvable.");

    const data: any = {};
    if (date_echeance !== undefined) {
      data.date_echeance = date_echeance ? new Date(date_echeance) : null;
    }
    if (notes !== undefined) {
      data.notes = notes;
    }

    const updated = await prisma.venteCredit.update({
      where: { id: creditId },
      data,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("PATCH /api/credits/[id]", e);
    return erreur(400, e?.message || "Erreur lors de la mise à jour.");
  }
}

/**
 * DELETE /api/credits/[id] — Supprimer un crédit et ses paiements associés
 * La vente originale n'est PAS supprimée, seulement le suivi crédit.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const creditId = Number(id);
  if (!Number.isInteger(creditId) || creditId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const credit = await prisma.venteCredit.findUnique({
      where: { id: creditId },
      select: { id: true, vente_id: true, statut: true },
    });
    if (!credit) return erreur(404, "Crédit introuvable.");

    await prisma.$transaction(async (tx) => {
      // Supprimer les paiements associés
      await tx.paiementCredit.deleteMany({ where: { credit_id: creditId } });
      // Supprimer le crédit
      await tx.venteCredit.delete({ where: { id: creditId } });
    });

    return NextResponse.json({ ok: true, message: "Crédit supprimé." });
  } catch (e: any) {
    console.error("DELETE /api/credits/[id]", e);
    return erreur(500, e?.message || "Erreur lors de la suppression du crédit.");
  }
}
