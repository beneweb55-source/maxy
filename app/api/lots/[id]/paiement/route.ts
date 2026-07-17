import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";

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
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");

    if (lot.paiement_valide) {
      return erreur(400, "Le paiement de ce lot a déjà été validé.");
    }

    const montant = lot.cout_global_declare;
    if (montant === null || montant <= 0) {
      return erreur(400, "Impossible de valider le paiement : aucun coût déclaré ou coût à zéro.");
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
        data: { paiement_valide: true },
      });
    });

    return NextResponse.json({ ok: true, montant });
  } catch (e) {
    console.error("POST /api/lots/[id]/paiement", e);
    return erreur(500, "Erreur lors de la validation du paiement.");
  }
}
