import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";

/**
 * API Produits Composés (BOM - Bill of Materials)
 *
 * Uses the new bom_entries join table for proper quantity tracking.
 *
 * GET    /api/produits/[id]/composants → Liste les composants + historique + stats
 * POST   /api/produits/[id]/composants → Attache un composant (crée ou incrémente BomEntry)
 * PATCH  /api/produits/[id]/composants → Modifier la quantité d'un composant
 * DELETE /api/produits/[id]/composants → Détache un composant
 */

/** Best-effort history write — never throws */
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

// GET : Lister les composants d'un produit via bom_entries
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

    // Composants via BomEntry
    const entries = await prisma.bomEntry.findMany({
      where: { produit_parent_id: produitId },
      include: {
        produit_composant: {
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
        },
      },
      orderBy: { id: "asc" },
    });

    const composants = entries.map((e) => ({
      ...e.produit_composant,
      quantite: e.quantite,
      bom_entry_id: e.id,
    }));

    // Stats
    const stats = await prisma.bomEntry.aggregate({
      where: { produit_parent_id: produitId },
      _count: true,
      _sum: { quantite: true },
    });

    const coutTotal = await prisma.bomEntry.findMany({
      where: { produit_parent_id: produitId },
      include: { produit_composant: { select: { prix_achat: true } } },
    });
    const sommePrix = coutTotal.reduce((s, e) => s + (e.produit_composant.prix_achat * e.quantite), 0);

    // Compter par catégorie
    const parCategorie: Record<string, number> = {};
    for (const e of entries) {
      const cat = e.produit_composant.categorie;
      parCategorie[cat] = (parCategorie[cat] || 0) + e.quantite;
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
        nb_composants: stats._count,
        quantite_totale: stats._sum.quantite || 0,
        cout_total: sommePrix,
        par_categorie: parCategorie,
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/composants", e);
    return erreur(500, "Erreur lors du chargement des composants.");
  }
}

// POST : Attacher un composant — crée BomEntry ou incrémente quantité
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
  const quantiteDemandee = Math.max(1, Number((corps as any)?.quantite) || 1);

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
        select: { id: true, reference: true, statut: true, bom_role: true, modele_id: true },
      });
      if (!composant) throw new Error("Composant introuvable.");
      if (composant.bom_role === "finished") {
        throw new Error(`"${composant.reference}" est un produit fini et ne peut pas être utilisé comme composant.`);
      }
      if (composant.statut === "vendu") {
        throw new Error("Ce composant est déjà vendu.");
      }
      if (composant.statut === "hs") {
        throw new Error("Ce composant est hors-service.");
      }

      // Upsert BomEntry — incrémente si existe déjà
      const existingEntry = await tx.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: parentId,
            produit_composant_id: composantId,
          },
        },
      });

      if (existingEntry) {
        // Incrémenter la quantité
        await tx.bomEntry.update({
          where: { id: existingEntry.id },
          data: { quantite: existingEntry.quantite + quantiteDemandee },
        });
      } else {
        // Créer nouvelle entrée
        await tx.bomEntry.create({
          data: {
            produit_parent_id: parentId,
            produit_composant_id: composantId,
            quantite: quantiteDemandee,
          },
        });

        // Marquer le parent comme composé si nécessaire
        if (!parent.est_compose) {
          await tx.produit.update({
            where: { id: parentId },
            data: { est_compose: true },
          });
        }

        // Mettre à jour le statut du composant (seulement pour la première attache)
        if (composant.statut !== "assemble") {
          const ancienStatut = composant.statut;
          await tx.produit.update({
            where: { id: composantId },
            data: { statut: "assemble", en_vitrine: false },
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
        }
      }

      // Sync stock count
      if (composant.modele_id) {
        await StockService.synchroniserCompteModele(composant.modele_id, tx);
      }

      return parent.reference;
    });

    // History logging — best-effort
    await tracerHistorique({
      produit_id: composantId,
      produit_parent_id: parentId,
      user_id: user.id,
      action: "assemblage",
      note: `Intégré dans "${result}" (x${quantiteDemandee})`,
    });

    return NextResponse.json({ ok: true, message: "Composant intégré avec succès." });
  } catch (e: any) {
    console.error("POST /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors de l'intégration du composant.");
  }
}

// PATCH : Modifier la quantité d'un composant
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

  const composantId = Number((corps as any)?.composant_id);
  const nouvelleQuantite = Number((corps as any)?.quantite);

  if (!Number.isInteger(composantId) || composantId <= 0) {
    return erreur(400, "Identifiant du composant invalide.");
  }
  if (!Number.isInteger(nouvelleQuantite) || nouvelleQuantite < 0) {
    return erreur(400, "La quantité doit être un entier positif.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: parentId,
            produit_composant_id: composantId,
          },
        },
      });
      if (!entry) throw new Error("Ce composant n'est pas rattaché à ce produit.");

      if (nouvelleQuantite === 0) {
        // Supprimer l'entrée
        await tx.bomEntry.delete({ where: { id: entry.id } });
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
            note: `Retiré du produit composé (ID #${parentId}) — quantité mise à 0`,
          },
        });
      } else {
        // Mettre à jour la quantité
        await tx.bomEntry.update({
          where: { id: entry.id },
          data: { quantite: nouvelleQuantite },
        });
      }
    });

    return NextResponse.json({ ok: true, message: "Quantité mise à jour." });
  } catch (e: any) {
    console.error("PATCH /api/produits/[id]/composants", e);
    return erreur(400, e?.message || "Erreur lors de la mise à jour.");
  }
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
      const entry = await tx.bomEntry.findUnique({
        where: {
          produit_parent_id_produit_composant_id: {
            produit_parent_id: parentId,
            produit_composant_id: composantId,
          },
        },
      });
      if (!entry) throw new Error("Ce composant n'est pas rattaché à ce produit.");

      // Supprimer l'entrée BOM
      await tx.bomEntry.delete({ where: { id: entry.id } });

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
