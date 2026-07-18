import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { validerLignesProduits } from "@/lib/validation";

export async function PUT(request: NextRequest) {
  const acces = await exigerUtilisateur(["technicien", "gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids, reference, categorie, prix_achat, image_url } = (corps ?? {}) as {
    ids?: unknown;
    reference?: unknown;
    categorie?: unknown;
    prix_achat?: unknown;
    image_url?: unknown;
  };

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  const produitIds = ids.map(Number);

  const validation = validerLignesProduits([{ reference, categorie, prix_achat, image_url }]);
  if (validation.erreur !== undefined) return erreur(400, validation.erreur);
  const ligne = validation.produits[0];
  if (!ligne) return erreur(400, "Données invalides.");

  try {
    const produits = await prisma.produit.findMany({ where: { id: { in: produitIds } } });
    if (produits.length !== produitIds.length) {
      return erreur(404, "Certains produits sont introuvables.");
    }
    
    if (produits.some(p => p.statut === "vendu")) {
      return erreur(400, "Un ou plusieurs produits sont déjà vendus et ne peuvent être modifiés.");
    }

    const donnees: Record<string, unknown> = {
      reference: ligne.reference,
      categorie: ligne.categorie,
      prix_achat: ligne.prix_achat,
    };
    if ("image_url" in (corps as object)) donnees.image_url = ligne.image_url ?? null;

    await prisma.produit.updateMany({
      where: { id: { in: produitIds } },
      data: donnees,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/produits/masse/edition", e);
    return erreur(500, "Erreur lors de la modification en masse.");
  }
}
