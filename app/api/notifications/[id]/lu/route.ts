import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const notifId = Number(id);
  if (!Number.isInteger(notifId)) return erreur(400, "Identifiant invalide.");

  try {
    const notification = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!notification) return erreur(404, "Notification introuvable.");
    if (notification.user_id !== user.id) {
      return erreur(403, "Cette notification ne vous appartient pas.");
    }
    await prisma.notification.update({ where: { id: notifId }, data: { lu: true } });
    return NextResponse.json({ ok: true, lien: notification.lien });
  } catch (e) {
    console.error("POST /api/notifications/[id]/lu", e);
    return erreur(500, "Erreur lors du marquage de la notification.");
  }
}
