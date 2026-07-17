import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { notes } = (corps ?? {}) as { notes?: unknown };
  if (typeof notes !== "string") return erreur(400, "Notes invalides.");

  try {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true },
    });
    if (!produit) return erreur(404, "Produit introuvable.");

    await prisma.produit.update({
      where: { id: produitId },
      data: { notes: notes.trim() || null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/produits/[id]/notes", e);
    return erreur(500, "Erreur lors de l'enregistrement de la note.");
  }
}
