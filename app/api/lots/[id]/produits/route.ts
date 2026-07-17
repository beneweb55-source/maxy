import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { genererCodesInternes } from "@/lib/codes";
import { validerLignesProduits } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { produits: produitsBruts } = (corps ?? {}) as { produits?: unknown };
  const validation = validerLignesProduits(produitsBruts);
  if (validation.erreur !== undefined) return erreur(400, validation.erreur);
  const lignes = validation.produits;

  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");
    if (lot.statut_lot !== "en_cours_de_test") {
      return erreur(400, "Impossible d'ajouter des produits : le lot n'est plus en cours de test.");
    }

    await prisma.$transaction(async (tx) => {
      const codes = await genererCodesInternes(tx, lignes.length);
      for (let i = 0; i < lignes.length; i++) {
        const ligne = lignes[i];
        const code = codes[i];
        if (!ligne || !code) continue;
        const produit = await tx.produit.create({
          data: {
            lot_id: lot.id,
            code_interne: code,
            reference: ligne.reference,
            categorie: ligne.categorie,
            prix_achat: ligne.prix_achat,
            image_url: ligne.image_url ?? null,
          },
        });
        await tx.historiqueStatut.create({
          data: {
            produit_id: produit.id,
            user_id: user.id,
            statut_avant: null,
            statut_apres: "recu",
          },
        });
      }
      // Si le lot est en mode auto et pas encore payé, recalculer le coût
      if (lot.cout_auto && !lot.paiement_valide) {
        const totalAchat = await tx.produit.aggregate({
          where: { lot_id: lot.id },
          _sum: { prix_achat: true },
        });
        await tx.lot.update({
          where: { id: lot.id },
          data: { cout_global_declare: totalAchat._sum.prix_achat ?? null },
        });
      }
    });

    return NextResponse.json({ ok: true, ajoutes: lignes.length }, { status: 201 });
  } catch (e) {
    console.error("POST /api/lots/[id]/produits", e);
    return erreur(500, "Erreur lors de l'ajout des produits.");
  }
}
