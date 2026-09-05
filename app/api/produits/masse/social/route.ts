import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

// Marque (ou démarque) plusieurs produits comme « postés sur les réseaux sociaux ».
export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids, poste_reseaux } = (corps ?? {}) as { ids?: unknown; poste_reseaux?: unknown };

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  if (typeof poste_reseaux !== "boolean") {
    return erreur(400, "Le champ « posté sur les réseaux » doit être vrai ou faux.");
  }
  const produitIds = ids.map(Number);

  try {
    const maj = await prisma.produit.updateMany({
      where: { id: { in: produitIds } },
      data: { poste_reseaux },
    });

    return NextResponse.json({ ok: true, modifies: maj.count });
  } catch (e) {
    console.error("POST /api/produits/masse/social", e);
    return erreur(500, "Erreur lors de la mise à jour du statut réseaux sociaux.");
  }
}
