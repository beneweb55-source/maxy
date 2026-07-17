import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { urlPhotoProduit } from "@/lib/images";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        produits: {
          orderBy: { id: "asc" },
          include: {
            reparations: { select: { id: true, cout: true, description: true, date: true } },
            historique: {
              where: { note: { not: null } },
              orderBy: { created_at: "desc" },
              take: 1,
              select: { note: true, created_at: true },
            },
          },
        },
      },
    });
    if (!lot) return erreur(404, "Lot introuvable.");

    return NextResponse.json({
      id: lot.id,
      fournisseur: lot.fournisseur,
      date_entree: lot.date_entree.toISOString(),
      statut_lot: lot.statut_lot,
      description: lot.description,
      quantite_attendue: lot.quantite_attendue,
      cout_global_declare: lot.cout_global_declare,
      produits: lot.produits.map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        categorie: p.categorie,
        statut: p.statut,
        prix_achat: p.prix_achat,
        image_url: p.image_url ? urlPhotoProduit(p.id) : null,
        derniere_note: p.historique.at(0)?.note ?? null,
        cout_reparations: p.reparations.reduce((s, r) => s + r.cout, 0),
        reparations: p.reparations.map((r) => ({
          id: r.id,
          cout: r.cout,
          description: r.description,
          date: r.date.toISOString(),
        })),
      })),
    });
  } catch (e) {
    console.error("GET /api/lots/[id]", e);
    return erreur(500, "Erreur lors du chargement du lot.");
  }
}
