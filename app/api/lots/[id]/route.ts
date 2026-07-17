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
      cout_auto: lot.cout_auto,
      paiement_valide: lot.paiement_valide,
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
  const { fournisseur, description, quantite_attendue, cout_global_declare, cout_auto } = (corps ?? {}) as {
    fournisseur?: unknown;
    description?: unknown;
    quantite_attendue?: unknown;
    cout_global_declare?: unknown;
    cout_auto?: unknown;
  };

  const donnees: {
    fournisseur?: string;
    description?: string | null;
    quantite_attendue?: number;
    cout_global_declare?: number | null;
    cout_auto?: boolean;
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

  if (cout_auto !== undefined) {
    if (typeof cout_auto !== "boolean") {
      return erreur(400, "Le champ cout_auto doit être un booléen.");
    }
    donnees.cout_auto = cout_auto;
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
  }

  if (Object.keys(donnees).length === 0) {
    return erreur(400, "Aucune modification fournie.");
  }

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { produits: { select: { prix_achat: true } } },
    });
    if (!lot) return erreur(404, "Lot introuvable.");

    // Bloquer la modification du coût et du mode si le paiement est déjà validé
    if (lot.paiement_valide) {
      if (cout_global_declare !== undefined || cout_auto !== undefined) {
        return erreur(400, "Le coût et le mode ne peuvent plus être modifiés car le paiement est déjà validé.");
      }
    }

    // Si on passe en mode auto, calculer le coût depuis les produits
    const passageAuto = donnees.cout_auto === true && !lot.cout_auto;
    if (passageAuto) {
      const somme = lot.produits.reduce((s, p) => s + p.prix_achat, 0);
      donnees.cout_global_declare = somme > 0 ? somme : null;
    }

    // En mode auto, interdire la saisie manuelle du coût
    if ((donnees.cout_auto ?? lot.cout_auto) && cout_global_declare !== undefined && !passageAuto) {
      return erreur(400, "En mode automatique, le coût déclaré est calculé à partir des produits. Passez en mode manuel pour le saisir.");
    }

    const maj = await prisma.lot.update({ where: { id: lotId }, data: donnees });

    return NextResponse.json({
      ok: true,
      id: maj.id,
      fournisseur: maj.fournisseur,
      description: maj.description,
      quantite_attendue: maj.quantite_attendue,
      cout_global_declare: maj.cout_global_declare,
      cout_auto: maj.cout_auto,
      paiement_valide: maj.paiement_valide,
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
