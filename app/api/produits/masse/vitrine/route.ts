import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

// Met (ou retire) plusieurs produits en vitrine en une seule opération.
export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids, en_vitrine } = (corps ?? {}) as { ids?: unknown; en_vitrine?: unknown };

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  if (typeof en_vitrine !== "boolean") {
    return erreur(400, "Le champ « en vitrine » doit être vrai ou faux.");
  }
  const produitIds = ids.map(Number);

  try {
    if (en_vitrine) {
      const vendus = await prisma.produit.count({
        where: { id: { in: produitIds }, statut: "vendu" },
      });
      if (vendus > 0) {
        return erreur(400, "Un produit vendu ne peut pas être mis en vitrine.");
      }
    }

    const maj = await prisma.produit.updateMany({
      where: { id: { in: produitIds } },
      data: { en_vitrine },
    });

    return NextResponse.json({ ok: true, modifies: maj.count });
  } catch (e) {
    console.error("POST /api/produits/masse/vitrine", e);
    return erreur(500, "Erreur lors de la mise à jour de la vitrine.");
  }
}
