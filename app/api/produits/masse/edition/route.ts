import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { validerLignesProduits } from "@/lib/validation";
import { genererCodesInternes } from "@/lib/codes";

export async function PUT(request: NextRequest) {
  const acces = await exigerUtilisateur(["technicien", "gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids, reference, categorie, prix_achat, image_url, quantite } = (corps ?? {}) as {
    ids?: unknown;
    reference?: unknown;
    categorie?: unknown;
    prix_achat?: unknown;
    image_url?: unknown;
    quantite?: unknown;
  };

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  const produitIds = ids.map(Number);
  
  let targetQuantite = produitIds.length;
  if (quantite !== undefined) {
    const q = Number(quantite);
    if (!Number.isInteger(q) || q < 1) {
      return erreur(400, "Quantité invalide.");
    }
    targetQuantite = q;
  }

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

    const diff = targetQuantite - produitIds.length;

    await prisma.$transaction(async (tx) => {
      let idsAUpdate = [...produitIds];
      
      // Suppression de l'excédent si la quantité est réduite
      if (diff < 0) {
        const nbASupprimer = -diff;
        const idsASupprimer = idsAUpdate.splice(-nbASupprimer, nbASupprimer);
        
        await tx.reparation.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.historiqueStatut.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.vente.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.mouvementCaisse.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.produit.deleteMany({ where: { id: { in: idsASupprimer } } });
      }

      // Mise à jour des produits existants restants
      if (idsAUpdate.length > 0) {
        await tx.produit.updateMany({
          where: { id: { in: idsAUpdate } },
          data: donnees,
        });
      }

      // Ajout des nouveaux produits si la quantité est augmentée
      if (diff > 0) {
        const originalProduct = produits[0];
        if (!originalProduct) throw new Error("Produit original manquant");
        const codes = await genererCodesInternes(tx, diff);
        for (let i = 0; i < diff; i++) {
          const code = codes[i];
          if (!code) continue;
          const produit = await tx.produit.create({
            data: {
              lot_id: originalProduct.lot_id,
              code_interne: code,
              reference: ligne.reference,
              categorie: ligne.categorie,
              prix_achat: ligne.prix_achat,
              image_url: ("image_url" in (corps as object)) ? (ligne.image_url ?? null) : originalProduct.image_url,
              statut: originalProduct.statut,
            },
          });
          await tx.historiqueStatut.create({
            data: {
              produit_id: produit.id,
              user_id: user.id,
              statut_avant: null,
              statut_apres: originalProduct.statut,
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/produits/masse/edition", e);
    return erreur(500, "Erreur lors de la modification en masse.");
  }
}
