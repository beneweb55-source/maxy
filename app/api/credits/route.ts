import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";

/**
 * GET /api/credits — Liste les crédits clients avec filtres
 * POST /api/credits — Crée un crédit à partir d'une vente existante
 */

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    const clientId = params.get("client_id");
    const statut = params.get("statut");
    const enRetard = params.get("en_retard") === "true";
    const q = params.get("q")?.trim();

    const where: any = {};

    if (clientId) {
      where.client_id = Number(clientId);
    }
    if (statut && ["paye", "partiellement_paye", "impaye", "en_retard"].includes(statut)) {
      where.statut = statut;
    }
    if (enRetard) {
      where.date_echeance = { lt: new Date() };
      where.statut = { not: "paye" };
    }
    if (q) {
      where.OR = [
        { client: { nom: { contains: q, mode: "insensitive" } } },
        { client: { telephone: { contains: q, mode: "insensitive" } } },
      ];
    }

    const credits = await prisma.venteCredit.findMany({
      where,
      include: {
        client: {
          select: { id: true, nom: true, telephone: true, email: true },
        },
        vente: {
          select: {
            id: true,
            prix_vente_reel: true,
            date_vente: true,
            type_vente: true,
            produit: {
              select: { code_interne: true, reference: true },
            },
          },
        },
        paiements: {
          orderBy: { date_paiement: "desc" },
          select: {
            id: true,
            montant: true,
            mode_paiement: true,
            date_paiement: true,
            reference: true,
            notes: true,
            user: { select: { username: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Mettre à jour les crédits en retard
    const maintenant = new Date();
    const aMettreAJour = credits.filter(
      (c) =>
        c.statut !== "paye" &&
        c.statut !== "en_retard" &&
        c.date_echeance &&
        c.date_echeance < maintenant,
    );

    if (aMettreAJour.length > 0) {
      await prisma.venteCredit.updateMany({
        where: { id: { in: aMettreAJour.map((c) => c.id) } },
        data: { statut: "en_retard" },
      });
      // Refléter le changement dans la réponse
      for (const c of aMettreAJour) {
        c.statut = "en_retard";
      }
    }

    // Totaux
    const tousCredits = await prisma.venteCredit.findMany({
      where: clientId ? { client_id: Number(clientId) } : {},
      select: { montant_total: true, montant_paye: true, montant_restant: true, statut: true },
    });

    const totaux = {
      nombre: tousCredits.length,
      montant_total: tousCredits.reduce((s, c) => s + c.montant_total, 0),
      montant_paye: tousCredits.reduce((s, c) => s + c.montant_paye, 0),
      montant_restant: tousCredits.reduce((s, c) => s + c.montant_restant, 0),
      nb_clients: new Set(tousCredits.map((_, i) => i)).size,
      nb_impayes: tousCredits.filter((c) => c.statut === "impaye" || c.statut === "en_retard").length,
      nb_partiels: tousCredits.filter((c) => c.statut === "partiellement_paye").length,
      nb_payes: tousCredits.filter((c) => c.statut === "paye").length,
    };

    return NextResponse.json({ credits, totaux });
  } catch (e) {
    console.error("GET /api/credits", e);
    return erreur(500, "Erreur lors du chargement des crédits.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const body = await request.json();
    const { vente_id, client_id, montant_paye_initial, date_echeance, notes } = body;

    const venteId = Number(vente_id);
    const clientId = Number(client_id);
    if (!Number.isInteger(venteId) || venteId <= 0) return erreur(400, "vente_id invalide.");
    if (!Number.isInteger(clientId) || clientId <= 0) return erreur(400, "client_id invalide.");

    const paiementInitial = Math.max(0, Number(montant_paye_initial) || 0);

    // Vérifier la vente
    const vente = await prisma.vente.findUnique({
      where: { id: venteId },
      select: { id: true, prix_vente_reel: true, annulee: true },
    });
    if (!vente) return erreur(404, "Vente introuvable.");
    if (vente.annulee) return erreur(400, "Cette vente est annulée.");

    // Vérifier qu'un crédit n'existe pas déjà pour cette vente
    const creditExistant = await prisma.venteCredit.findUnique({
      where: { vente_id: venteId },
    });
    if (creditExistant) return erreur(400, "Un crédit existe déjà pour cette vente.");

    // Vérifier le client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) return erreur(404, "Client introuvable.");

    const montantTotal = vente.prix_vente_reel;
    const montantPaye = Math.min(paiementInitial, montantTotal);
    const montantRestant = montantTotal - montantPaye;

    const statut = montantRestant <= 0 ? "paye" : montantPaye > 0 ? "partiellement_paye" : "impaye";

    const credit = await prisma.$transaction(async (tx) => {
      const c = await tx.venteCredit.create({
        data: {
          vente_id: venteId,
          client_id: clientId,
          montant_total: montantTotal,
          montant_paye: montantPaye,
          montant_restant: montantRestant,
          statut: statut as any,
          date_echeance: date_echeance ? new Date(date_echeance) : null,
          notes: notes || null,
        },
      });

      // Enregistrer le paiement initial si > 0
      if (montantPaye > 0) {
        await tx.paiementCredit.create({
          data: {
            credit_id: c.id,
            montant: montantPaye,
            mode_paiement: "especes",
            user_id: acces.user.id,
            notes: "Paiement initial",
          },
        });
      }

      return c;
    });

    return NextResponse.json(credit, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/credits", e);
    return erreur(400, e?.message || "Erreur lors de la création du crédit.");
  }
}
