import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";
import { formaterDA } from "@/lib/caisse";

/**
 * Valide manuellement le coût d'un lot et déclenche le retrait correspondant en
 * caisse (mouvement `achat_lot`). Réservé au gérant : le technicien n'a aucun
 * accès caisse. En mode `auto`, le montant est la somme des prix d'achat des
 * produits du lot ; en mode `manuel`, c'est le coût global déclaré.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { produits: { select: { prix_achat: true } } },
    });
    if (!lot) return erreur(404, "Lot introuvable.");
    if (lot.cout_valide) {
      return erreur(409, "Le coût de ce lot a déjà été validé.");
    }

    const montant =
      lot.mode_cout === "auto"
        ? lot.produits.reduce((s, p) => s + p.prix_achat, 0)
        : lot.cout_global_declare ?? 0;

    if (montant <= 0) {
      return erreur(
        400,
        lot.mode_cout === "auto"
          ? "Aucun produit à comptabiliser : ajoutez des produits avant de valider le coût."
          : "Le coût global déclaré doit être supérieur à 0 pour être validé."
      );
    }

    await prisma.$transaction(async (tx) => {
      await ajouterMouvement(tx, {
        montant,
        type: "achat_lot",
        user_id: user.id,
        lot_id: lot.id,
        description: `Achat lot n°${lot.id} — ${lot.fournisseur}`,
      });
      await tx.lot.update({
        where: { id: lot.id },
        data: {
          cout_valide: true,
          // En mode auto, on fige le coût déclaré sur le montant validé pour l'affichage.
          cout_global_declare: lot.mode_cout === "auto" ? montant : lot.cout_global_declare,
        },
      });
    });

    return NextResponse.json({ ok: true, montant, message: `Coût validé — ${formaterDA(montant)} retirés de la caisse.` });
  } catch (e) {
    console.error("POST /api/lots/[id]/valider-cout", e);
    return erreur(500, "Erreur lors de la validation du coût du lot.");
  }
}
