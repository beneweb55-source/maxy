import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { urlPhotoProduit, validerPhoto } from "@/lib/images";

const JOUR_MS = 24 * 60 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  try {
    const p = await prisma.produit.findUnique({
      where: { id: produitId },
      include: {
        lot: { select: { id: true, fournisseur: true, date_entree: true, statut_lot: true } },
        reparations: {
          orderBy: { date: "asc" },
          include: { user: { select: { username: true } } },
        },
        historique: {
          orderBy: { created_at: "asc" },
          include: { user: { select: { username: true } } },
        },
        ventes: {
          orderBy: { date_vente: "asc" },
          include: { vendeur: { select: { username: true } } },
        },
      },
    });
    if (!p) return erreur(404, "Produit introuvable.");

    const coutReparations = p.reparations.reduce((s, r) => s + r.cout, 0);
    return NextResponse.json({
      id: p.id,
      code_interne: p.code_interne,
      reference: p.reference,
      categorie: p.categorie,
      statut: p.statut,
      notes: p.notes,
      image_url: p.image_url ? urlPhotoProduit(p.id) : null,
      decision_rapport: p.decision_rapport,
      prix_achat: p.prix_achat,
      cout_reparations: coutReparations,
      prix_vente_fixe: p.prix_vente_fixe,
      prix_vente_reel: p.prix_vente_reel,
      date_vente: p.date_vente ? p.date_vente.toISOString() : null,
      marge:
        p.prix_vente_reel !== null
          ? p.prix_vente_reel - p.prix_achat - coutReparations
          : null,
      jours_stock: Math.floor((Date.now() - p.lot.date_entree.getTime()) / JOUR_MS),
      lot: {
        id: p.lot.id,
        fournisseur: p.lot.fournisseur,
        date_entree: p.lot.date_entree.toISOString(),
        statut_lot: p.lot.statut_lot,
      },
      reparations: p.reparations.map((r) => ({
        id: r.id,
        cout: r.cout,
        description: r.description,
        date: r.date.toISOString(),
        par: r.user.username,
      })),
      historique: p.historique.map((h) => ({
        id: h.id,
        statut_avant: h.statut_avant,
        statut_apres: h.statut_apres,
        note: h.note,
        quand: h.created_at.toISOString(),
        par: h.user.username,
      })),
      ventes: p.ventes.map((v) => ({
        id: v.id,
        prix_vente_reel: v.prix_vente_reel,
        canal: v.canal,
        date_vente: v.date_vente.toISOString(),
        vendeur: v.vendeur.username,
        annulee: v.annulee,
        motif_annulation: v.motif_annulation,
      })),
    });
  } catch (e) {
    console.error("GET /api/produits/[id]", e);
    return erreur(500, "Erreur lors du chargement du produit.");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { reference, categorie, prix_achat, image_url } = (corps ?? {}) as {
    reference?: unknown;
    categorie?: unknown;
    prix_achat?: unknown;
    image_url?: unknown;
  };

  const donnees: {
    reference?: string;
    categorie?: string;
    prix_achat?: number;
    image_url?: string | null;
  } = {};
  if (reference !== undefined) {
    if (typeof reference !== "string" || !reference.trim()) {
      return erreur(400, "La référence est obligatoire.");
    }
    donnees.reference = reference.trim();
  }
  if (categorie !== undefined) {
    if (typeof categorie !== "string" || !categorie.trim()) {
      return erreur(400, "La catégorie est obligatoire.");
    }
    donnees.categorie = categorie.trim();
  }
  if (prix_achat !== undefined) {
    if (typeof prix_achat !== "number" || !Number.isInteger(prix_achat) || prix_achat < 0) {
      return erreur(400, "Le prix d'achat doit être un entier positif en DA.");
    }
    donnees.prix_achat = prix_achat;
  }
  if (image_url !== undefined) {
    if (image_url === null || (typeof image_url === "string" && !image_url.trim())) {
      donnees.image_url = null;
    } else if (typeof image_url === "string") {
      const soucisPhoto = validerPhoto(image_url.trim());
      if (soucisPhoto) return erreur(400, soucisPhoto);
      donnees.image_url = image_url.trim();
    } else {
      return erreur(400, "Photo invalide.");
    }
  }
  if (Object.keys(donnees).length === 0) {
    return erreur(400, "Aucune modification fournie.");
  }

  try {
    const produit = await prisma.produit.findUnique({ where: { id: produitId } });
    if (!produit) return erreur(404, "Produit introuvable.");
    if (produit.statut === "vendu") {
      return erreur(400, "Produit vendu : fiche verrouillée, aucune modification possible.");
    }

    const maj = await prisma.produit.update({ where: { id: produitId }, data: donnees });
    return NextResponse.json({
      ok: true,
      id: maj.id,
      reference: maj.reference,
      categorie: maj.categorie,
      prix_achat: maj.prix_achat,
    });
  } catch (e) {
    console.error("PUT /api/produits/[id]", e);
    return erreur(500, "Erreur lors de la modification du produit.");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  try {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      include: {
        _count: { select: { ventes: true, mouvements: true } },
      },
    });
    if (!produit) return erreur(404, "Produit introuvable.");
    if (produit.statut === "vendu" || produit._count.ventes > 0 || produit._count.mouvements > 0) {
      return erreur(
        400,
        "Ce produit a un historique de vente ou de caisse : il ne peut pas être supprimé."
      );
    }

    await prisma.$transaction([
      prisma.historiqueStatut.deleteMany({ where: { produit_id: produitId } }),
      prisma.reparation.deleteMany({ where: { produit_id: produitId } }),
      prisma.produit.delete({ where: { id: produitId } }),
    ]);

    return NextResponse.json({ ok: true, supprime: produit.code_interne });
  } catch (e) {
    console.error("DELETE /api/produits/[id]", e);
    return erreur(500, "Erreur lors de la suppression du produit.");
  }
}
