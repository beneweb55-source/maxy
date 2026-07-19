import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

const STATUTS_DECISION = ["a_reparer", "manque_piece", "hs"] as const;

export async function GET() {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const lots = await prisma.lot.findMany({
      where: { statut_lot: { in: ["teste", "valide"] } },
      orderBy: { date_entree: "desc" },
      include: {
        produits: { select: { statut: true, decision_rapport: true, prix_achat: true } },
      },
    });
    return NextResponse.json({
      rapports: lots.map((lot) => {
        const concernes = lot.produits.filter((p) =>
          (STATUTS_DECISION as readonly string[]).includes(p.statut)
        );
        return {
          lot_id: lot.id,
          fournisseur: lot.fournisseur,
          date_entree: lot.date_entree.toISOString(),
          statut_lot: lot.statut_lot,
          nb_produits: lot.produits.length,
          valeur_achat: lot.produits.reduce((s, p) => s + p.prix_achat, 0),
          resume: {
            ok: lot.produits.filter((p) => p.statut === "ok").length,
            a_reparer: lot.produits.filter((p) => p.statut === "a_reparer").length,
            manque_piece: lot.produits.filter((p) => p.statut === "manque_piece").length,
            hs: lot.produits.filter((p) => p.statut === "hs").length,
          },
          decisions_requises: concernes.length,
          decisions_prises: concernes.filter((p) => p.decision_rapport !== null).length,
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/rapports", e);
    return erreur(500, "Erreur lors du chargement des rapports.");
  }
}
