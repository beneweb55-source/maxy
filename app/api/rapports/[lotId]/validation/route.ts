import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { idsParRole, notifier } from "@/lib/notifs";

const STATUTS_DECISION = ["a_reparer", "manque_piece", "hs"] as const;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { lotId: brut } = await params;
  const lotId = Number(brut);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        produits: { select: { id: true, statut: true, decision_rapport: true } },
      },
    });
    if (!lot) return erreur(404, "Lot introuvable.");
    if (lot.statut_lot === "valide") return erreur(400, "Ce rapport est déjà validé.");
    if (lot.statut_lot !== "teste") return erreur(400, "Le lot n'est pas encore clôturé.");

    const concernes = lot.produits.filter((p) =>
      (STATUTS_DECISION as readonly string[]).includes(p.statut)
    );
    const manquantes = concernes.filter((p) => p.decision_rapport === null).length;
    if (manquantes > 0) {
      return erreur(
        400,
        `Validation bloquée : ${manquantes} décision${manquantes > 1 ? "s" : ""} manquante${manquantes > 1 ? "s" : ""}.`
      );
    }

    await prisma.$transaction(async (tx) => {
      let enReparation = 0;
      for (const p of concernes) {
        if (p.decision_rapport === "vendre_en_etat" && p.statut !== "ok") {
          await tx.produit.update({ where: { id: p.id }, data: { statut: "ok" } });
          await tx.historiqueStatut.create({
            data: {
              produit_id: p.id,
              user_id: user.id,
              statut_avant: p.statut,
              statut_apres: "ok",
              note: "Décision du rapport : vendre en l'état",
            },
          });
        } else if (p.decision_rapport === "pieces_detachees" && p.statut !== "hs") {
          await tx.produit.update({ where: { id: p.id }, data: { statut: "hs" } });
          await tx.historiqueStatut.create({
            data: {
              produit_id: p.id,
              user_id: user.id,
              statut_avant: p.statut,
              statut_apres: "hs",
              note: "Décision du rapport : pièces détachées",
            },
          });
        } else if (p.decision_rapport === "reparer") {
          enReparation += 1;
        }
      }

      await tx.lot.update({ where: { id: lot.id }, data: { statut_lot: "valide" } });

      const techniciens = await idsParRole(tx, "technicien");
      await notifier(
        tx,
        techniciens,
        `Rapport du lot n°${lot.id} validé — ${enReparation} produit${enReparation > 1 ? "s" : ""} en file de réparation`,
        `/lots/${lot.id}`
      );
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/rapports/[lotId]/validation", e);
    return erreur(500, "Erreur lors de la validation du rapport.");
  }
}
