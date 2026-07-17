import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { urlPhotoProduit } from "@/lib/images";
import { ajouterMouvement } from "@/lib/caisse-db";
import { formaterDA } from "@/lib/caisse";

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
      calcul_cout_auto: lot.calcul_cout_auto,
      paye: lot.paye,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const user = acces.user;
  const { fournisseur, description, quantite_attendue, cout_global_declare, calcul_cout_auto } = (corps ?? {}) as {
    fournisseur?: unknown;
    description?: unknown;
    quantite_attendue?: unknown;
    cout_global_declare?: unknown;
    calcul_cout_auto?: unknown;
  };

  const donnees: {
    fournisseur?: string;
    description?: string | null;
    quantite_attendue?: number;
    cout_global_declare?: number | null;
    calcul_cout_auto?: boolean;
  } = {};
  if (fournisseur !== undefined) {
    if (typeof fournisseur !== "string" || !fournisseur.trim()) {
      return erreur(400, "Le fournisseur est obligatoire.");
    }
    donnees.fournisseur = fournisseur.trim();
  }
  if (description !== undefined) {
    if (description === null || (typeof description === "string" && !description.trim())) {
      donnees.description = null;
    } else if (typeof description === "string") {
      donnees.description = description.trim();
    } else {
      return erreur(400, "Description invalide.");
    }
  }
  if (quantite_attendue !== undefined) {
    if (
      typeof quantite_attendue !== "number" ||
      !Number.isInteger(quantite_attendue) ||
      quantite_attendue <= 0
    ) {
      return erreur(400, "La quantité attendue doit être un entier strictement positif.");
    }
    donnees.quantite_attendue = quantite_attendue;
  }

  let coutFourni = false;
  if (calcul_cout_auto !== undefined) {
    if (typeof calcul_cout_auto !== "boolean") {
      return erreur(400, "calcul_cout_auto doit être un booléen.");
    }
    donnees.calcul_cout_auto = calcul_cout_auto;
  }

  if (cout_global_declare !== undefined) {
    if (user.role !== "gerant") {
      return erreur(403, "Seul le gérant peut corriger le coût déclaré.");
    }
    if (cout_global_declare === null) {
      donnees.cout_global_declare = null;
    } else if (
      typeof cout_global_declare === "number" &&
      Number.isInteger(cout_global_declare) &&
      cout_global_declare >= 0
    ) {
      donnees.cout_global_declare = cout_global_declare;
    } else {
      return erreur(400, "Le coût global déclaré doit être un entier positif en DA.");
    }
    coutFourni = true;
  }

  if (Object.keys(donnees).length === 0) {
    return erreur(400, "Aucune modification fournie.");
  }

  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");

    const maj = await prisma.lot.update({ where: { id: lotId }, data: donnees });

    return NextResponse.json({
      ok: true,
      id: maj.id,
      fournisseur: maj.fournisseur,
      description: maj.description,
      quantite_attendue: maj.quantite_attendue,
      cout_global_declare: maj.cout_global_declare,
      calcul_cout_auto: maj.calcul_cout_auto,
    });
  } catch (e) {
    console.error("PATCH /api/lots/[id]", e);
    return erreur(500, "Erreur lors de la modification du lot.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");

    const [mouvements, vendus] = await Promise.all([
      prisma.mouvementCaisse.count({
        where: { OR: [{ lot_id: lotId }, { produit: { lot_id: lotId } }] },
      }),
      prisma.produit.count({ where: { lot_id: lotId, statut: "vendu" } }),
    ]);
    if (mouvements > 0 || vendus > 0) {
      return erreur(
        400,
        "Ce lot a un historique de caisse (coût déclaré, réparation ou vente) : il ne peut pas être supprimé."
      );
    }

    await prisma.$transaction([
      prisma.historiqueStatut.deleteMany({ where: { produit: { lot_id: lotId } } }),
      prisma.reparation.deleteMany({ where: { produit: { lot_id: lotId } } }),
      prisma.produit.deleteMany({ where: { lot_id: lotId } }),
      prisma.lot.delete({ where: { id: lotId } }),
    ]);

    return NextResponse.json({ ok: true, supprime: lotId });
  } catch (e) {
    console.error("DELETE /api/lots/[id]", e);
    return erreur(500, "Erreur lors de la suppression du lot.");
  }
}
