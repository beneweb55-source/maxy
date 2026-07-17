import { NextResponse, type NextRequest } from "next/server";
import type { DecisionRapport } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

const DECISIONS_VALIDES = ["reparer", "vendre_en_etat", "pieces_detachees"] as const;
const STATUTS_DECISION = ["a_reparer", "manque_piece", "hs"] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  const { lotId: brut } = await params;
  const lotId = Number(brut);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { decisions } = (corps ?? {}) as { decisions?: unknown };
  if (!Array.isArray(decisions) || decisions.length === 0) {
    return erreur(400, "Aucune décision fournie.");
  }

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { produits: { select: { id: true, statut: true } } },
    });
    if (!lot) return erreur(404, "Lot introuvable.");
    if (lot.statut_lot !== "teste") {
      return erreur(
        400,
        lot.statut_lot === "valide"
          ? "Ce rapport est déjà validé : les décisions ne sont plus modifiables."
          : "Le lot n'est pas encore clôturé."
      );
    }

    const concernes = new Map(
      lot.produits
        .filter((p) => (STATUTS_DECISION as readonly string[]).includes(p.statut))
        .map((p) => [p.id, p.statut])
    );

    const aAppliquer: { produit_id: number; decision: DecisionRapport }[] = [];
    for (const d of decisions as { produit_id?: unknown; decision?: unknown }[]) {
      const produitId = Number(d?.produit_id);
      const decision = d?.decision;
      if (!Number.isInteger(produitId) || !concernes.has(produitId)) {
        return erreur(400, "Une décision vise un produit qui ne relève pas de ce rapport.");
      }
      if (
        typeof decision !== "string" ||
        !(DECISIONS_VALIDES as readonly string[]).includes(decision)
      ) {
        return erreur(400, "Décision invalide : réparer, vendre en l'état ou pièces détachées.");
      }
      aAppliquer.push({ produit_id: produitId, decision: decision as DecisionRapport });
    }

    await prisma.$transaction(async (tx) => {
      for (const d of aAppliquer) {
        await tx.produit.update({
          where: { id: d.produit_id },
          data: { decision_rapport: d.decision },
        });
      }
    });

    return NextResponse.json({ ok: true, enregistrees: aAppliquer.length });
  } catch (e) {
    console.error("PUT /api/rapports/[lotId]/decisions", e);
    return erreur(500, "Erreur lors de l'enregistrement des décisions.");
  }
}
