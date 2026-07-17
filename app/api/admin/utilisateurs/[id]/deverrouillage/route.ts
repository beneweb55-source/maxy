import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) return erreur(400, "Identifiant d'utilisateur invalide.");

  try {
    const utilisateur = await prisma.user.findUnique({ where: { id: userId } });
    if (!utilisateur) return erreur(404, "Utilisateur introuvable.");

    await prisma.user.update({
      where: { id: userId },
      data: { login_attempts: 0, locked_until: null },
    });

    return NextResponse.json({ ok: true, username: utilisateur.username });
  } catch (e) {
    console.error("POST /api/admin/utilisateurs/[id]/deverrouillage", e);
    return erreur(500, "Erreur lors du déverrouillage du compte.");
  }
}
