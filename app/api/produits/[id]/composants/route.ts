import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";

/**
 * API Produits Composés (BOM - Bill of Materials)
 * 
 * GET  /api/produits/[id]/composants → Liste les composants du produit parent
 * POST /api/produits/[id]/composants → Attache un composant existant (le retire du stock général)
 * DELETE /api/produits/[id]/composants → Détache un composant (le remet au stock)
 */

// GET : Lister les composants d'un produit
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
    const composants = await prisma.produit.findMany({
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
        modele: { select: { nom: true } },
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ composants });
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
        select: { id: true, reference: true, statut: true },
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

      // Attacher : passer le composant au statut 'assemble' + lier au parent
      await tx.produit.update({
        where: { id: composantId },
        data: {
          parent_id: parentId,
          statut: "assemble",
          en_vitrine: false,
        },
      });

      // Tracer dans l'historique
      await tx.historiqueStatut.create({
        data: {
          produit_id: composantId,
          user_id: user.id,
          statut_avant: composant.statut,
          statut_apres: "assemble",
          note: `Intégré comme composant dans "${parent.reference}" (ID #${parentId})`,
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

      // Tracer dans l'historique
      await tx.historiqueStatut.create({
        data: {
          produit_id: composantId,
          user_id: user.id,
          statut_avant: "assemble",
          statut_apres: "ok",
          note: `Retiré du produit composé (ID #${parentId}) — Retour en stock`,
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
