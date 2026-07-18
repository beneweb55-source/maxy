import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function DELETE(request: NextRequest) {
  const acces = await exigerUtilisateur(["technicien", "gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids } = (corps ?? {}) as { ids?: unknown };

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  const produitIds = ids.map(Number);

  try {
    const produits = await prisma.produit.findMany({ where: { id: { in: produitIds } } });
    if (produits.length !== produitIds.length) {
      return erreur(404, "Certains produits sont introuvables.");
    }
    
    if (produits.some(p => p.statut === "vendu")) {
      return erreur(400, "Un ou plusieurs produits sont déjà vendus et ne peuvent être supprimés.");
    }

    await prisma.$transaction(async (tx) => {
      // Nettoyer les dépendances des produits avant suppression
      await tx.reparation.deleteMany({ where: { produit_id: { in: produitIds } } });
      await tx.historiqueStatut.deleteMany({ where: { produit_id: { in: produitIds } } });
      await tx.vente.deleteMany({ where: { produit_id: { in: produitIds } } });
      await tx.mouvementCaisse.deleteMany({ where: { produit_id: { in: produitIds } } });
      await tx.produit.deleteMany({ where: { id: { in: produitIds } } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/produits/masse/suppression", e);
    return erreur(500, "Erreur lors de la suppression en masse.");
  }
}
