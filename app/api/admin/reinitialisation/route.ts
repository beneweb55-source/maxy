import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { confirmation } = (corps ?? {}) as { confirmation?: unknown };
  if (confirmation !== "REINITIALISER") {
    return erreur(400, "Confirmation invalide : saisissez exactement REINITIALISER.");
  }

  try {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE notifications, mouvements_caisse, historique_statuts,
       reparations, ventes, produits, lots
       RESTART IDENTITY CASCADE`
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/reinitialisation", e);
    return erreur(500, "Erreur lors de la réinitialisation des données.");
  }
}
