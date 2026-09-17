import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import * as BomService from "@/lib/bom-service";

/**
 * API Slots de Composition (Template de BOM)
 *
 * GET    /api/produits/[id]/slots → Liste les slots d'un produit template
 * POST   /api/produits/[id]/slots → Ajoute un slot au template
 * PUT    /api/produits/[id]/slots → Modifie un slot
 * DELETE /api/produits/[id]/slots → Supprime un slot (vérifie qu'il est vide)
 */

// GET : Lister les slots d'un produit
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
    const slots = await BomService.getSlots(prisma, produitId);

    // Si le produit n'a pas de slots, retourner un tableau vide
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("GET /api/produits/[id]/slots", e);
    return erreur(500, "Erreur lors du chargement des slots.");
  }
}

// POST : Ajouter un slot au template
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    return erreur(400, "Identifiant de produit invalide.");
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const { label, type_composant, quantite, obligatoire, attributs_requis } =
    corps as any;

  if (!label || typeof label !== "string") {
    return erreur(400, "Le nom du slot (label) est requis.");
  }
  if (!type_composant || typeof type_composant !== "string") {
    return erreur(400, "Le type de composant est requis.");
  }

  try {
    // Vérifier que le produit existe et le marquer comme template
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, est_template: true },
    });
    if (!produit) return erreur(404, "Produit introuvable.");

    if (!produit.est_template) {
      await prisma.produit.update({
        where: { id: produitId },
        data: { est_template: true },
      });
    }

    const slot = await prisma.slotDefinition.create({
      data: {
        produit_parent_id: produitId,
        label: label.trim(),
        type_composant: type_composant.trim(),
        quantite: Math.max(1, Number(quantite) || 1),
        obligatoire: obligatoire !== false,
        attributs_requis: attributs_requis || null,
      },
    });

    return NextResponse.json({ ok: true, slot });
  } catch (e: any) {
    console.error("POST /api/produits/[id]/slots", e);
    return erreur(400, e?.message || "Erreur lors de la création du slot.");
  }
}

// PUT : Modifier un slot
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    return erreur(400, "Identifiant de produit invalide.");
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const { slot_id, label, type_composant, quantite, obligatoire, attributs_requis } =
    corps as any;

  if (!slot_id) return erreur(400, "L'identifiant du slot est requis.");

  try {
    const slot = await prisma.slotDefinition.findUnique({
      where: { id: Number(slot_id) },
    });
    if (!slot || slot.produit_parent_id !== produitId) {
      return erreur(404, "Slot introuvable pour ce produit.");
    }

    const updated = await prisma.slotDefinition.update({
      where: { id: Number(slot_id) },
      data: {
        ...(label && { label: label.trim() }),
        ...(type_composant && { type_composant: type_composant.trim() }),
        ...(quantite && { quantite: Math.max(1, Number(quantite)) }),
        ...(obligatoire !== undefined && { obligatoire: Boolean(obligatoire) }),
        ...(attributs_requis !== undefined && { attributs_requis }),
      },
    });

    return NextResponse.json({ ok: true, slot: updated });
  } catch (e: any) {
    console.error("PUT /api/produits/[id]/slots", e);
    return erreur(400, e?.message || "Erreur lors de la modification du slot.");
  }
}

// DELETE : Supprimer un slot
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    return erreur(400, "Identifiant de produit invalide.");
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const { slot_id } = corps as any;
  if (!slot_id) return erreur(400, "L'identifiant du slot est requis.");

  try {
    const slot = await prisma.slotDefinition.findUnique({
      where: { id: Number(slot_id) },
      include: { _count: { select: { installed_components: true } } },
    });
    if (!slot || slot.produit_parent_id !== produitId) {
      return erreur(404, "Slot introuvable pour ce produit.");
    }

    if (slot._count.installed_components > 0) {
      return erreur(
        400,
        "Impossible de supprimer un slot qui contient encore des composants. Retirez-les d'abord."
      );
    }

    await prisma.slotDefinition.delete({
      where: { id: Number(slot_id) },
    });

    return NextResponse.json({ ok: true, message: "Slot supprimé." });
  } catch (e: any) {
    console.error("DELETE /api/produits/[id]/slots", e);
    return erreur(400, e?.message || "Erreur lors de la suppression du slot.");
  }
}
