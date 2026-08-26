import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
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
  const { ids, modele } = (corps ?? {}) as { ids?: unknown; modele?: unknown };

  // Deux modes :
  //  • ids     : suppression d'unités précises (ex. un exemplaire).
  //  • modele  : suppression de TOUS les exemplaires en stock d'une référence
  //              (référence + catégorie), indépendamment de la pagination —
  //              c'est le « tout supprimer d'un coup » après une saisie en masse.
  let where: Prisma.ProduitWhereInput;
  if (modele && typeof modele === "object") {
    const { reference, categorie } = modele as { reference?: unknown; categorie?: unknown };
    if (typeof reference !== "string" || typeof categorie !== "string" || !reference.trim() || !categorie.trim()) {
      return erreur(400, "Modèle invalide.");
    }
    where = {
      reference: { equals: reference.trim(), mode: "insensitive" },
      categorie: { equals: categorie.trim(), mode: "insensitive" },
    };
  } else if (Array.isArray(ids) && ids.length > 0 && ids.every((id) => Number.isInteger(Number(id)))) {
    where = { id: { in: ids.map(Number) } };
  } else {
    return erreur(400, "Fournissez une liste d'identifiants ou un modèle.");
  }

  try {
    // On ne supprime jamais un produit vendu (son historique de vente et son
    // mouvement de caisse doivent être conservés). En mode « modèle » on les
    // ignore silencieusement ; en mode « ids » on refuse le lot pour éviter
    // une suppression partielle surprise.
    const cibles = await prisma.produit.findMany({
      where,
      select: { 
        id: true, 
        statut: true,
        _count: { select: { ventes: true, mouvements: true } }
      },
    });
    if (cibles.length === 0) {
      return erreur(404, "Aucun produit à supprimer.");
    }

    const vendusOuHistorique = cibles.filter((p) => p.statut === "vendu" || p._count.ventes > 0 || p._count.mouvements > 0);
    const aSupprimer = cibles.filter((p) => p.statut !== "vendu" && p._count.ventes === 0 && p._count.mouvements === 0).map((p) => p.id);

    if ("ids" in (corps as object) && !modele && vendusOuHistorique.length > 0) {
      return erreur(400, "Un ou plusieurs produits ont un historique financier (ventes/mouvements) et ne peuvent être supprimés.");
    }
    if (aSupprimer.length === 0) {
      return erreur(400, "Ces produits ont un historique financier et ne peuvent être supprimés.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.produitImage.deleteMany({ where: { produit_id: { in: aSupprimer } } });
      await tx.reparation.deleteMany({ where: { produit_id: { in: aSupprimer } } });
      await tx.historiqueStatut.deleteMany({ where: { produit_id: { in: aSupprimer } } });
      await tx.produit.deleteMany({ where: { id: { in: aSupprimer } } });
    });

    return NextResponse.json({
      ok: true,
      supprimes: aSupprimer.length,
      vendus_conserves: vendusOuHistorique.length,
    });
  } catch (e) {
    console.error("DELETE /api/produits/masse/suppression", e);
    return erreur(500, "Erreur lors de la suppression en masse.");
  }
}
