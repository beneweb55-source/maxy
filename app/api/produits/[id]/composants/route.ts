import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";

/**
 * API Produits Composés (Composants physiques)
 *
 * Utilise la relation native `parent_id` dans la table Produit.
 * Chaque composant est une instance physique unique avec quantite = 1.
 *
 * GET    /api/produits/[id]/composants → Liste les composants physiques + historique + stats
 * POST   /api/produits/[id]/composants → Attache un composant existant (set parent_id)
 * PATCH  /api/produits/[id]/composants → Non supporté (quantite toujours 1)
 * DELETE /api/produits/[id]/composants → Détache un composant (set parent_id = null)
 */

async function tracerHistorique(data: {
  produit_id: number;
  produit_parent_id: number | null;
  user_id: number;
  action: string;
  composant_remplace_id?: number | null;
  note?: string;
}) {
  try {
    await prisma.compositionHistorique.create({ data });
  } catch (err: any) {
    console.warn("compositionHistorique write skipped:", err.message);
  }
}

// GET : Lister les composants d'un produit (parent_id)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId) || produitId <= 0) {
    return erreur(400, "Identifiant de produit invalide.");
  }

  try {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, reference: true, est_compose: true },
    });

    if (!produit) {
      return erreur(404, "Produit introuvable.");
    }

    // Composants physiques attachés
    const composantsFiltres = await prisma.produit.findMany({
      where: { parent_id: produitId },
      select: {
        id: true,
        code_interne: true,
        reference: true,
        categorie: true,
        numero_serie: true,
        grade: true,
        statut: true,
        prix_achat: true,
        image_url: true,
        modele: { select: { nom: true, categorie_id: true } },
      },
      orderBy: { id: "asc" },
    });

    const composants = composantsFiltres.map((c) => ({
      ...c,
      quantite: 1, // Fixe pour un produit physique
      bom_entry_id: c.id, // Gardé pour compatibilité front temporaire (s'il l'utilise comme clé)
    }));

    // Stats
    const nb_composants = composants.length;
    const coutTotal = composants.reduce((s, e) => s + (e.prix_achat || 0), 0);

    // Compter par catégorie
    const parCategorie: Record<string, number> = {};
    for (const c of composants) {
      parCategorie[c.categorie] = (parCategorie[c.categorie] || 0) + 1;
    }

    // Historique
    let historique: any[] = [];
    try {
      historique = await prisma.compositionHistorique.findMany({
        where: { produit_parent_id: produitId },
        include: {
          produit: { select: { code_interne: true, reference: true } },
          user: { select: { username: true } },
        },
        orderBy: { created_at: "desc" },
        take: 10,
      });
    } catch {
      // Table may not exist
    }

    return NextResponse.json({
      composants,
      historique,
      stats: {
        nb_composants: nb_composants,
        quantite_totale: nb_composants,
        cout_total: coutTotal,
        par_categorie: parCategorie,
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/composants", e);
    return erreur(500, "Erreur lors du chargement des composants.");
  }
}

// POST : Attacher un composant
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const parentId = Number(id);
  if (!Number.isInteger(parentId) || parentId <= 0) {
    return erreur(400, "Identifiant de produit parent invalide.");
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const composantId = Number((corps as any)?.composant_id);

  if (!Number.isInteger(composantId) || composantId <= 0) {
    return erreur(400, "Identifiant du composant invalide.");
  }
  if (composantId === parentId) {
    return erreur(400, "Un produit ne peut pas être son propre composant.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const parent = await tx.produit.findUnique({
        where: { id: parentId },
        select: { id: true, reference: true, est_compose: true },
      });
      if (!parent) throw new Error("Produit parent introuvable.");

      const composant = await tx.produit.findUnique({
        where: { id: composantId },
        select: { id: true, reference: true, statut: true, bom_role: true, modele_id: true, parent_id: true },
      });
      if (!composant) throw new Error("Composant introuvable.");
      if (composant.parent_id !== null) {
        throw new Error(`Ce composant est déjà affecté à un autre produit (parent_id: ${composant.parent_id}).`);
      }
      if (composant.bom_role === "finished") {
        throw new Error(`"${composant.reference}" est un produit fini et ne peut pas être utilisé comme composant.`);
      }
      if (composant.statut === "vendu") {
        throw new Error("Ce composant est déjà vendu.");
      }
      if (composant.statut === "hs") {
        throw new Error("Ce composant est hors-service.");
      }

      // Marquer le parent comme composé si nécessaire
      if (!parent.est_compose) {
        await tx.produit.update({
          where: { id: parentId },
          data: { est_compose: true },
        });
      }

      // Attacher le composant et mettre à jour le statut
      const ancienStatut = composant.statut;
      await tx.produit.update({
        where: { id: composantId },
        data: { parent_id: parentId, statut: "assemble", en_vitrine: false },
      });

      await tx.historiqueStatut.create({
        data: {
          produit_id: composantId,
          user_id: user.id,
          statut_avant: ancienStatut,
          statut_apres: "assemble",
          note: `Intégré comme composant dans "${parent.reference}" (ID #${parentId})`,
        },
      });

      // Sync stock count
      if (composant.modele_id) {
        await StockService.synchroniserCompteModele(composant.modele_id, tx);
      }

      return parent.reference;
    });

    await tracerHistorique({
      produit_id: composantId,
      produit_parent_id: parentId,
      user_id: user.id,
      action: "assemblage",
      note: `Intégré dans "${result}" (quantité: 1)`,
    });

    return NextResponse.json({ ok: true, message: "Composant intégré avec succès." });
  } catch (e: any) {
    console.error("POST /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors de l'intégration du composant.");
  }
}

// PATCH : Modifier la quantité d'un composant n'a plus de sens (quantité toujours 1)
export async function PATCH() {
  return erreur(400, "La modification de quantité n'est plus supportée (chaque composant physique compte pour 1).");
}

// DELETE : Détacher un composant
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const parentId = Number(id);
  if (!Number.isInteger(parentId) || parentId <= 0) {
    return erreur(400, "Identifiant de produit parent invalide.");
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const composantId = Number((corps as any)?.composant_id);
  if (!Number.isInteger(composantId) || composantId <= 0) {
    return erreur(400, "Identifiant du composant invalide.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const composant = await tx.produit.findUnique({
        where: { id: composantId },
      });
      if (!composant || composant.parent_id !== parentId) {
        throw new Error("Ce composant n'est pas rattaché à ce produit.");
      }

      // Remettre le composant au stock
      await tx.produit.update({
        where: { id: composantId },
        data: { parent_id: null, statut: "ok" },
      });

      await tx.historiqueStatut.create({
        data: {
          produit_id: composantId,
          user_id: user.id,
          statut_avant: "assemble",
          statut_apres: "ok",
          note: `Retiré du produit composé (ID #${parentId}) — Retour en stock`,
        },
      });

      if (composant.modele_id) {
        await StockService.synchroniserCompteModele(composant.modele_id, tx);
      }
    });

    await tracerHistorique({
      produit_id: composantId,
      produit_parent_id: parentId,
      user_id: user.id,
      action: "désassemblage",
      note: `Retiré du composé (ID #${parentId}) — retour en stock`,
    });

    return NextResponse.json({ ok: true, message: "Composant retiré et remis en stock." });
  } catch (e: any) {
    console.error("DELETE /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors du retrait.");
  }
}
