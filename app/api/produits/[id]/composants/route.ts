import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";

/**
 * API Produits Composés (BOM - Bill of Materials)
 *
 * GET    /api/produits/[id]/composants → Liste les composants + historique + stats
 * POST   /api/produits/[id]/composants → Attache un composant existant
 * PATCH  /api/produits/[id]/composants → Remplacement atomique d'un composant
 * DELETE /api/produits/[id]/composants → Détache un composant
 */

// GET : Lister les composants d'un produit + historique + stats
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
    const [produit, composants, historique, stats] = await Promise.all([
      // Vérifier que le parent existe et est composé
      prisma.produit.findUnique({
        where: { id: produitId },
        select: { id: true, reference: true, est_compose: true },
      }),
      // Composants attachés
      prisma.produit.findMany({
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
      }),
      // 10 dernières opérations d'assemblage sur ce parent
      prisma.compositionHistorique.findMany({
        where: { produit_parent_id: produitId },
        include: {
          produit: { select: { code_interne: true, reference: true } },
          user: { select: { username: true } },
        },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
      // Stats agrégées
      prisma.produit.aggregate({
        where: { parent_id: produitId },
        _count: true,
        _sum: { prix_achat: true },
      }),
    ]);

    if (!produit) {
      return erreur(404, "Produit introuvable.");
    }

    // Compter les composants par catégorie
    const parCategorie: Record<string, number> = {};
    for (const c of composants) {
      parCategorie[c.categorie] = (parCategorie[c.categorie] || 0) + 1;
    }

    return NextResponse.json({
      composants,
      historique,
      stats: {
        nb_composants: stats._count,
        cout_total: stats._sum.prix_achat || 0,
        par_categorie: parCategorie,
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/composants", e);
    return erreur(500, "Erreur lors du chargement des composants.");
  }
}

// POST : Attacher un composant au produit parent
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
    await prisma.$transaction(async (tx) => {
      // Vérifier que le produit parent existe
      const parent = await tx.produit.findUnique({
        where: { id: parentId },
        select: { id: true, reference: true, statut: true, modele_id: true },
      });
      if (!parent) throw new Error("Produit parent introuvable.");

      // Vérifier que le composant existe et est disponible
      const composant = await tx.produit.findUnique({
        where: { id: composantId },
        select: { id: true, reference: true, statut: true, parent_id: true, modele_id: true },
      });
      if (!composant) throw new Error("Composant introuvable.");
      if (composant.parent_id !== null) {
        throw new Error(`Ce composant est déjà intégré dans un autre produit (ID: ${composant.parent_id}).`);
      }
      if (composant.statut === "vendu") {
        throw new Error("Ce composant est déjà vendu et ne peut pas être intégré.");
      }
      if (composant.statut === "hs") {
        throw new Error("Ce composant est hors-service et ne peut pas être intégré.");
      }
      if (composant.statut === "assemble") {
        throw new Error("Ce composant est déjà assemblé dans un autre produit.");
      }

      const ancienStatut = composant.statut;

      // Attacher : passer le composant au statut 'assemble' + lier au parent
      await tx.produit.update({
        where: { id: composantId },
        data: {
          parent_id: parentId,
          statut: "assemble",
          en_vitrine: false,
        },
      });

      // Tracer dans l'historique de statut
      await tx.historiqueStatut.create({
        data: {
          produit_id: composantId,
          user_id: user.id,
          statut_avant: ancienStatut,
          statut_apres: "assemble",
          note: `Intégré comme composant dans "${parent.reference}" (ID #${parentId})`,
        },
      });

      // Tracer dans l'historique d'assemblage
      await tx.compositionHistorique.create({
        data: {
          produit_id: composantId,
          produit_parent_id: parentId,
          user_id: user.id,
          action: "assemblage",
          note: `Intégré dans "${parent.reference}"`,
        },
      });

      // Mettre à jour la quantité du Modèle si le composant y est lié
      if (composant.modele_id) {
        await StockService.synchroniserCompteModele(composant.modele_id, tx);
      }
    });

    return NextResponse.json({ ok: true, message: "Composant intégré avec succès." });
  } catch (e: any) {
    console.error("POST /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors de l'intégration du composant.");
  }
}

// PATCH : Remplacement atomique d'un composant
export async function PATCH(
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

  const ancienComposantId = Number((corps as any)?.ancien_composant_id);
  const nouveauComposantId = Number((corps as any)?.nouveau_composant_id);

  if (!Number.isInteger(ancienComposantId) || ancienComposantId <= 0) {
    return erreur(400, "Identifiant de l'ancien composant invalide.");
  }
  if (!Number.isInteger(nouveauComposantId) || nouveauComposantId <= 0) {
    return erreur(400, "Identifiant du nouveau composant invalide.");
  }
  if (ancienComposantId === nouveauComposantId) {
    return erreur(400, "L'ancien et le nouveau composant sont identiques.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Vérifier le parent
      const parent = await tx.produit.findUnique({
        where: { id: parentId },
        select: { id: true, reference: true },
      });
      if (!parent) throw new Error("Produit parent introuvable.");

      // Vérifier l'ancien composant
      const ancien = await tx.produit.findUnique({
        where: { id: ancienComposantId },
        select: { id: true, reference: true, parent_id: true, statut: true, modele_id: true },
      });
      if (!ancien) throw new Error("Ancien composant introuvable.");
      if (ancien.parent_id !== parentId) {
        throw new Error("L'ancien composant n'appartient pas à ce produit parent.");
      }

      // Vérifier le nouveau composant
      const nouveau = await tx.produit.findUnique({
        where: { id: nouveauComposantId },
        select: { id: true, reference: true, statut: true, parent_id: true, modele_id: true },
      });
      if (!nouveau) throw new Error("Nouveau composant introuvable.");
      if (nouveau.parent_id !== null) {
        throw new Error("Le nouveau composant est déjà intégré dans un autre produit.");
      }
      if (nouveau.statut === "vendu") {
        throw new Error("Le nouveau composant est vendu.");
      }
      if (nouveau.statut === "hs") {
        throw new Error("Le nouveau composant est hors-service.");
      }

      // 1. Détacher l'ancien composant
      await tx.produit.update({
        where: { id: ancienComposantId },
        data: { parent_id: null, statut: "ok" },
      });
      await tx.historiqueStatut.create({
        data: {
          produit_id: ancienComposantId,
          user_id: user.id,
          statut_avant: "assemble",
          statut_apres: "ok",
          note: `Remplacé par "${nouveau.reference}" (ID #${nouveauComposantId}) dans "${parent.reference}"`,
        },
      });
      await tx.compositionHistorique.create({
        data: {
          produit_id: ancienComposantId,
          produit_parent_id: parentId,
          user_id: user.id,
          action: "remplacement",
          composant_remplace_id: nouveauComposantId,
          note: `Retiré du composé "${parent.reference}" — remplacé par "${nouveau.reference}"`,
        },
      });
      if (ancien.modele_id) {
        await StockService.synchroniserCompteModele(ancien.modele_id, tx);
      }

      // 2. Attacher le nouveau composant
      await tx.produit.update({
        where: { id: nouveauComposantId },
        data: {
          parent_id: parentId,
          statut: "assemble",
          en_vitrine: false,
        },
      });
      await tx.historiqueStatut.create({
        data: {
          produit_id: nouveauComposantId,
          user_id: user.id,
          statut_avant: nouveau.statut,
          statut_apres: "assemble",
          note: `Remplace "${ancien.reference}" (ID #${ancienComposantId}) dans "${parent.reference}"`,
        },
      });
      await tx.compositionHistorique.create({
        data: {
          produit_id: nouveauComposantId,
          produit_parent_id: parentId,
          user_id: user.id,
          action: "assemblage",
          note: `Intégré dans "${parent.reference}" en remplacement de "${ancien.reference}"`,
        },
      });
      if (nouveau.modele_id) {
        await StockService.synchroniserCompteModele(nouveau.modele_id, tx);
      }
    });

    return NextResponse.json({ ok: true, message: "Composant remplacé avec succès." });
  } catch (e: any) {
    console.error("PATCH /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors du remplacement du composant.");
  }
}

// DELETE : Détacher un composant (le remet au stock)
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
        select: { id: true, reference: true, parent_id: true, statut: true, modele_id: true },
      });
      if (!composant) throw new Error("Composant introuvable.");
      if (composant.parent_id !== parentId) {
        throw new Error("Ce composant n'appartient pas à ce produit parent.");
      }

      // Détacher : remettre au stock avec statut 'ok'
      await tx.produit.update({
        where: { id: composantId },
        data: {
          parent_id: null,
          statut: "ok",
        },
      });

      // Tracer dans l'historique de statut
      await tx.historiqueStatut.create({
        data: {
          produit_id: composantId,
          user_id: user.id,
          statut_avant: "assemble",
          statut_apres: "ok",
          note: `Retiré du produit composé (ID #${parentId}) — Retour en stock`,
        },
      });

      // Tracer dans l'historique d'assemblage
      await tx.compositionHistorique.create({
        data: {
          produit_id: composantId,
          produit_parent_id: parentId,
          user_id: user.id,
          action: "désassemblage",
          note: `Retiré du composé (ID #${parentId}) — retour en stock`,
        },
      });

      // Mettre à jour la quantité du Modèle si le composant y est lié
      if (composant.modele_id) {
        await StockService.synchroniserCompteModele(composant.modele_id, tx);
      }
    });

    return NextResponse.json({ ok: true, message: "Composant retiré et remis en stock." });
  } catch (e: any) {
    console.error("DELETE /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors du retrait du composant.");
  }
}
