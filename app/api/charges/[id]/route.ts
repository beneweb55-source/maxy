import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";

/**
 * GET    /api/charges/[id] — Détail d'une charge
 * PATCH  /api/charges/[id] — Modifier une charge
 * DELETE /api/charges/[id] — Supprimer une charge
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const chargeId = Number(id);
  if (!Number.isInteger(chargeId) || chargeId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    if (!charge) return erreur(404, "Charge introuvable.");
    return NextResponse.json(charge);
  } catch (e) {
    console.error("GET /api/charges/[id]", e);
    return erreur(500, "Erreur lors du chargement de la charge.");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const chargeId = Number(id);
  if (!Number.isInteger(chargeId) || chargeId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const body = await request.json();
    const { categorie, libelle, description, montant, date_charge, mode_paiement, beneficiaire, reference, statut, notes } = body;

    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      select: { id: true },
    });
    if (!charge) return erreur(404, "Charge introuvable.");

    const data: any = {};
    if (categorie !== undefined) data.categorie = categorie;
    if (libelle !== undefined) data.libelle = libelle.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (montant !== undefined) {
      const montantNum = Number(montant);
      if (!Number.isFinite(montantNum) || montantNum <= 0) {
        return erreur(400, "Le montant doit être un nombre positif.");
      }
      data.montant = Math.round(montantNum);
    }
    if (date_charge !== undefined) data.date_charge = new Date(date_charge);
    if (mode_paiement !== undefined) data.mode_paiement = mode_paiement;
    if (beneficiaire !== undefined) data.beneficiaire = beneficiaire?.trim() || null;
    if (reference !== undefined) data.reference = reference?.trim() || null;
    if (statut !== undefined) data.statut = statut;
    if (notes !== undefined) data.notes = notes?.trim() || null;

    const updated = await prisma.charge.update({
      where: { id: chargeId },
      data,
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("PATCH /api/charges/[id]", e);
    return erreur(400, e?.message || "Erreur lors de la mise à jour.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const chargeId = Number(id);
  if (!Number.isInteger(chargeId) || chargeId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      select: { id: true },
    });
    if (!charge) return erreur(404, "Charge introuvable.");

    await prisma.charge.delete({ where: { id: chargeId } });
    return NextResponse.json({ ok: true, message: "Charge supprimée." });
  } catch (e: any) {
    console.error("DELETE /api/charges/[id]", e);
    return erreur(400, e?.message || "Erreur lors de la suppression.");
  }
}
