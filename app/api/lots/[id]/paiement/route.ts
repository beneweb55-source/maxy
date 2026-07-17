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
    const res = await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: lotId } });
      if (!lot) throw new Error("Lot introuvable.");
      if (lot.paye) throw new Error("Ce lot a déjà été payé.");

      const cout = lot.cout_global_declare;
      if (cout === null || cout === undefined) {
        throw new Error("Impossible de payer : aucun coût global n'est défini pour ce lot.");
      }
      if (cout <= 0) {
        throw new Error("Le coût du lot doit être strictement positif pour effectuer un paiement.");
      }

      await ajouterMouvement(tx, {
        montant: cout,
        type: "achat_lot",
        user_id: user.id,
        lot_id: lot.id,
        description: `Achat lot n°${lot.id} — ${lot.fournisseur}${lot.calcul_cout_auto ? " (Coût auto)" : ""}`,
      });

      const lotMaj = await tx.lot.update({
        where: { id: lot.id },
        data: { paye: true },
      });

      return lotMaj;
    });

    return NextResponse.json({ ok: true, paye: true, lot_id: res.id });
  } catch (e) {
    console.error("POST /api/lots/[id]/paiement", e);
    const msg = e instanceof Error ? e.message : "Erreur lors de la validation du paiement.";
    // Map expected errors to 400
    if (msg.includes("introuvable")) return erreur(404, msg);
    if (msg.includes("déjà été payé") || msg.includes("aucun coût") || msg.includes("strictement positif")) {
      return erreur(400, msg);
    }
    return erreur(500, msg);
  }
}
