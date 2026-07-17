import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { idsParRole, notifier } from "@/lib/notifs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["technicien"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { produits: { select: { statut: true } } },
    });
    if (!lot) return erreur(404, "Lot introuvable.");
    if (lot.statut_lot !== "en_cours_de_test") {
      return erreur(400, "Ce lot est déjà clôturé.");
    }
    const restants = lot.produits.filter((p) => p.statut === "recu").length;
    if (restants > 0) {
      return erreur(
        400,
        `Clôture impossible : ${restants} produit${restants > 1 ? "s" : ""} encore en statut « Reçu ».`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.lot.update({ where: { id: lot.id }, data: { statut_lot: "teste" } });
      const gerants = await idsParRole(tx, "gerant");
      await notifier(
        tx,
        gerants,
        `Rapport du lot n°${lot.id} prêt à valider`,
        `/rapports/${lot.id}`
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/lots/[id]/cloture", e);
    return erreur(500, "Erreur lors de la clôture du lot.");
  }
}
