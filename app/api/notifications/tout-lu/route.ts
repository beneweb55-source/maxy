import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function POST() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const resultat = await prisma.notification.updateMany({
      where: { user_id: acces.user.id, lu: false },
      data: { lu: true },
    });
    return NextResponse.json({ ok: true, marquees: resultat.count });
  } catch (e) {
    console.error("POST /api/notifications/tout-lu", e);
    return erreur(500, "Erreur lors du marquage des notifications.");
  }
}
