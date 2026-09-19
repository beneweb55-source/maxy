import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
// NOTE: Pas de mouvement_caisse ici car la vente originale a déjà enregistré
// le montant total en caisse. Les paiements crédit sont tracés dans paiement_credits.

/**
 * GET  /api/credits/[id]/paiements — Historique des paiements d'un crédit
 * POST /api/credits/[id]/paiements — Enregistrer un paiement
 *
 * Règles :
 * - Le paiement ne peut pas dépasser le montant restant
 * - Le statut est recalculé automatiquement
 * - Chaque paiement est individuellement tracé
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const creditId = Number(id);
  if (!Number.isInteger(creditId) || creditId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const paiements = await prisma.paiementCredit.findMany({
      where: { credit_id: creditId },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { date_paiement: "desc" },
    });

    return NextResponse.json({ paiements });
  } catch (e) {
    console.error("GET /api/credits/[id]/paiements", e);
    return erreur(500, "Erreur lors du chargement des paiements.");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const creditId = Number(id);
  if (!Number.isInteger(creditId) || creditId <= 0) return erreur(400, "Identifiant invalide.");

  try {
    const body = await request.json();
    const { montant, mode_paiement, reference, notes } = body;

    const montantPaiement = Number(montant);
    if (!Number.isInteger(montantPaiement) || montantPaiement <= 0) {
      return erreur(400, "Le montant doit être un entier positif.");
    }

    // Récupérer le crédit
    const credit = await prisma.venteCredit.findUnique({
      where: { id: creditId },
      select: { id: true, montant_restant: true, statut: true, montant_total: true, montant_paye: true },
    });
    if (!credit) return erreur(404, "Crédit introuvable.");
    if (credit.statut === "paye") {
      return erreur(400, "Ce crédit est déjà entièrement payé.");
    }
    if (montantPaiement > credit.montant_restant) {
      return erreur(
        400,
        `Le montant (${montantPaiement} DA) dépasse le reste à payer (${credit.montant_restant} DA).`,
      );
    }

    // Modes de paiement valides
    const modesValides = ["especes", "virement", "carte", "cheque", "autre"];
    const mode = modesValides.includes(mode_paiement) ? mode_paiement : "especes";

    const nouveauMontantPaye = credit.montant_paye + montantPaiement;
    const nouveauRestant = credit.montant_total - nouveauMontantPaye;
    const nouveauStatut = nouveauRestant <= 0 ? "paye" : "partiellement_paye";

    const paiement = await prisma.$transaction(async (tx) => {
      const p = await tx.paiementCredit.create({
        data: {
          credit_id: creditId,
          montant: montantPaiement,
          mode_paiement: mode as any,
          reference: reference || null,
          notes: notes || null,
          user_id: acces.user.id,
        },
      });

      await tx.venteCredit.update({
        where: { id: creditId },
        data: {
          montant_paye: nouveauMontantPaye,
          montant_restant: nouveauRestant,
          statut: nouveauStatut as any,
        },
      });

      return p;
    });

    return NextResponse.json(
      {
        paiement,
        credit: {
          montant_paye: nouveauMontantPaye,
          montant_restant: nouveauRestant,
          statut: nouveauStatut,
        },
      },
      { status: 201 },
    );
  } catch (e: any) {
    console.error("POST /api/credits/[id]/paiements", e);
    return erreur(400, e?.message || "Erreur lors de l'enregistrement du paiement.");
  }
}
