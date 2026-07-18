import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { DUREE_SESSION_S } from "@/lib/session";
import { estLangue } from "@/lib/i18n/types";

// Enregistre la langue d'interface préférée sur le compte de l'utilisateur
// courant, et rafraîchit le cookie de langue.
export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const langue = (corps as { langue?: unknown } | null)?.langue;
  if (!estLangue(langue)) {
    return erreur(400, "Langue invalide (attendu « fr » ou « en »).");
  }

  try {
    await prisma.user.update({
      where: { id: acces.user.id },
      data: { langue },
    });
  } catch (e) {
    console.error("POST /api/parametres/langue", e);
    return erreur(500, "Erreur lors de l'enregistrement de la langue.");
  }

  const reponse = NextResponse.json({ ok: true, langue });
  reponse.cookies.set("langue", langue, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SESSION_S,
  });
  return reponse;
}
