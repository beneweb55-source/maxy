import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const entreeId = Number(id);
  if (!Number.isInteger(entreeId)) return erreur(400, "ID invalide.");

  try {
    const entree = await prisma.carnetEntree.findUnique({
      where: { id: entreeId },
      include: {
        user: { select: { id: true, username: true, role: true } },
        pieces_jointes: true,
      },
    });

    if (!entree) return erreur(404, "Entrée introuvable.");

    return NextResponse.json(entree);
  } catch (e) {
    console.error("GET /api/carnet/[id]", e);
    return erreur(500, "Erreur lors du chargement de l'entrée.");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const entreeId = Number(id);
  if (!Number.isInteger(entreeId)) return erreur(400, "ID invalide.");

  let corps: any;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  try {
    const existant = await prisma.carnetEntree.findUnique({ where: { id: entreeId } });
    if (!existant) return erreur(404, "Entrée introuvable.");

    // Sécurité : Seul l'auteur peut modifier son propre rapport
    if (existant.user_id !== user.id) {
      return erreur(403, "Vous n'avez pas le droit de modifier ce rapport.");
    }

    const data: any = {};
    if (corps.titre !== undefined) data.titre = String(corps.titre).trim();
    if (corps.categorie !== undefined) data.categorie = corps.categorie;
    if (corps.date_travail !== undefined) data.date_travail = new Date(corps.date_travail);
    if (corps.contenu !== undefined) data.contenu = String(corps.contenu);

    const maj = await prisma.carnetEntree.update({
      where: { id: entreeId },
      data,
    });

    return NextResponse.json(maj);
  } catch (e) {
    console.error("PUT /api/carnet/[id]", e);
    return erreur(500, "Erreur lors de la mise à jour de l'entrée.");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const entreeId = Number(id);
  if (!Number.isInteger(entreeId)) return erreur(400, "ID invalide.");

  try {
    const existant = await prisma.carnetEntree.findUnique({ where: { id: entreeId } });
    if (!existant) return erreur(404, "Entrée introuvable.");

    if (existant.user_id !== user.id) {
      return erreur(403, "Vous n'avez pas le droit de supprimer ce rapport.");
    }

    await prisma.carnetEntree.delete({ where: { id: entreeId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/carnet/[id]", e);
    return erreur(500, "Erreur lors de la suppression.");
  }
}
