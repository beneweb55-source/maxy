import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { urlPhotoProduit } from "@/lib/images";
import { idsAvecCouverture } from "@/lib/images-flags";
import { ajouterMouvement } from "@/lib/caisse-db";
import { formaterDA } from "@/lib/caisse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        // `select` explicite : ne pas rapatrier les photos base64 des produits
        // du lot (la vue les affiche via leurs URL).
        produits: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            code_interne: true,
            reference: true,
            categorie: true,
            statut: true,
            en_vitrine: true,
            prix_achat: true,
            prix_vente_fixe: true,
            reparations: { select: { id: true, cout: true, description: true, date: true } },
            _count: { select: { images: true } },
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

    // Présence des couvertures : booléens seuls, aucune image transférée.
    const avecCouverture = await idsAvecCouverture(lot.produits.map((p) => p.id));

    return NextResponse.json({
      id: lot.id,
      fournisseur: lot.fournisseur,
      date_entree: lot.date_entree.toISOString(),
      statut_lot: lot.statut_lot,
      description: lot.description,
      quantite_attendue: lot.quantite_attendue,
      cout_global_declare: lot.cout_global_declare,
      mode_cout: lot.mode_cout,
      cout_valide: lot.cout_valide,
      produits: lot.produits.map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        categorie: p.categorie,
        statut: p.statut,
        en_vitrine: p.en_vitrine,
        prix_achat: p.prix_achat,
        image_url: avecCouverture.has(p.id) ? urlPhotoProduit(p.id) : null,
        nb_images: (avecCouverture.has(p.id) ? 1 : 0) + p._count.images,
        derniere_note: p.historique.at(0)?.note ?? null,
        cout_reparations: p.reparations.reduce((s, r) => s + r.cout, 0),
        prix_vente_fixe: p.prix_vente_fixe,
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
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
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
  const { fournisseur, description, quantite_attendue, cout_global_declare } = (corps ?? {}) as {
    fournisseur?: unknown;
    description?: unknown;
    quantite_attendue?: unknown;
    cout_global_declare?: unknown;
  };

  const donnees: {
    fournisseur?: string;
    description?: string | null;
    quantite_attendue?: number;
    cout_global_declare?: number | null;
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
  if (cout_global_declare !== undefined) {
    if (user.role !== "gerant") {
      return erreur(403, "Seul le gérant peut corriger le coût déclaré (impact caisse).");
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

    const ancienCout = lot.cout_global_declare ?? 0;
    const nouveauCout = coutFourni ? (donnees.cout_global_declare ?? 0) : ancienCout;
    const delta = coutFourni ? nouveauCout - ancienCout : 0;

    const maj = await prisma.$transaction(async (tx) => {
      const lotMaj = await tx.lot.update({ where: { id: lotId }, data: donnees });
      if (delta !== 0) {
        await ajouterMouvement(tx, {
          montant: Math.abs(delta),
          type: delta > 0 ? "frais" : "apport_associe",
          user_id: user.id,
          lot_id: lotId,
          description: `Correction du coût déclaré du lot n°${lotId} : de ${formaterDA(ancienCout)} à ${formaterDA(nouveauCout)}`,
        });
      }
      return lotMaj;
    });

    return NextResponse.json({
      ok: true,
      id: maj.id,
      fournisseur: maj.fournisseur,
      description: maj.description,
      quantite_attendue: maj.quantite_attendue,
      cout_global_declare: maj.cout_global_declare,
      correction_caisse: delta !== 0 ? delta : undefined,
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
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const lotId = Number(id);
  if (!Number.isInteger(lotId)) return erreur(400, "Identifiant de lot invalide.");

  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");

    await prisma.$transaction([
      prisma.produitImage.deleteMany({ where: { produit: { lot_id: lotId } } }),
      prisma.mouvementCaisse.deleteMany({ where: { OR: [{ lot_id: lotId }, { produit: { lot_id: lotId } }] } }),
      prisma.vente.deleteMany({ where: { produit: { lot_id: lotId } } }),
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
