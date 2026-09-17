import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";
import * as BomService from "@/lib/bom-service";

/**
 * API Remplacement de Composant
 *
 * POST /api/produits/[id]/composants/remplacer
 *
 * Remplace atomiquement un composant par un autre :
 * - Détache l'ancien composant (→ stock)
 * - Attache le nouveau composant (← stock)
 * - Enregistre l'historique de remplacement
 */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev", "technicien"]);
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
  const motif = (corps as any)?.motif as string | undefined;

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
      const res = await BomService.remplacerComposant(tx, {
        parentId,
        ancienComposantId,
        nouveauComposantId,
        userId: user.id,
        motif,
      });

      // Sync stock pour les deux composants
      const [ancien, nouveau] = await Promise.all([
        tx.produit.findUnique({
          where: { id: ancienComposantId },
          select: { modele_id: true },
        }),
        tx.produit.findUnique({
          where: { id: nouveauComposantId },
          select: { modele_id: true },
        }),
      ]);

      if (ancien?.modele_id) {
        await StockService.synchroniserCompteModele(ancien.modele_id, tx);
      }
      if (nouveau?.modele_id) {
        await StockService.synchroniserCompteModele(nouveau.modele_id, tx);
      }

      return res;
    });

    return NextResponse.json({ ok: true, message: "Composant remplacé avec succès." });
  } catch (e: any) {
    console.error("POST /api/produits/[id]/composants/remplacer", e);
    return erreur(400, e?.message || "Erreur lors du remplacement.");
  }
}
