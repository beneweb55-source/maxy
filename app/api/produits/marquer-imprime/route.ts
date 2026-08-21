import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  
  const { ids } = (corps ?? {}) as { ids?: unknown };
  if (!Array.isArray(ids) || ids.length === 0) {
    return erreur(400, "Aucun identifiant fourni.");
  }

  const idsValides = ids.map(Number).filter((id) => !isNaN(id));
  if (idsValides.length === 0) return erreur(400, "Identifiants invalides.");

  try {
    const res = await prisma.produit.updateMany({
      where: { id: { in: idsValides } },
      data: {
        etiquette_imprimee: true,
        etiquette_imprimee_le: new Date(),
      },
    });

    return NextResponse.json({ ok: true, mis_a_jour: res.count });
  } catch (e) {
    console.error("POST /api/produits/marquer-imprime", e);
    return erreur(500, "Erreur lors de la mise à jour du statut d'impression.");
  }
}
