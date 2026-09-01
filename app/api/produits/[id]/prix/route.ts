import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { formaterDA } from "@/lib/caisse";
import { entierPositif } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { prix_vente_fixe } = (corps ?? {}) as { prix_vente_fixe?: unknown };
  const erreurPrix = entierPositif(prix_vente_fixe, "Le prix de vente");
  if (erreurPrix) return erreur(400, erreurPrix);
  const prix = prix_vente_fixe as number;

  try {
    const produit = await prisma.produit.findUnique({ where: { id: produitId } });
    if (!produit) return erreur(404, "Produit introuvable.");
    if (produit.statut === "vendu") {
      return erreur(400, "Produit vendu : verrouillé, aucune modification possible (sauf notes).");
    }
    if (produit.statut !== "ok") {
      return erreur(400, "Seul un produit en statut « OK » peut être mis en vente.");
    }

    await prisma.$transaction(async (tx) => {
      const identiques = await tx.produit.findMany({
        where: {
          lot_id: produit.lot_id,
          reference: produit.reference,
          categorie: produit.categorie,
        }
      });
      // We update price for all non-sold identical products of this model
      const produitsToUpdate = identiques.filter(p => p.statut !== "vendu");

      // Update prix_vente_fixe for all non-sold identical products
      const idsTous = produitsToUpdate.map(p => p.id);
      await tx.produit.updateMany({
        where: { id: { in: idsTous } },
        data: { prix_vente_fixe: prix },
      });

      // Only products currently in 'ok' status transition to 'en_vente'
      const produitsOk = produitsToUpdate.filter(p => p.statut === "ok");
      if (produitsOk.length > 0) {
        await tx.produit.updateMany({
          where: { id: { in: produitsOk.map(p => p.id) } },
          data: { statut: "en_vente" },
        });

        const historiques = produitsOk.map(p => ({
          produit_id: p.id,
          user_id: user.id,
          statut_avant: "ok" as const,
          statut_apres: "en_vente" as const,
          note: p.id === produit.id ? `Prix fixé : ${formaterDA(prix)}` : `Prix fixé en cascade : ${formaterDA(prix)}`,
        }));
        await tx.historiqueStatut.createMany({ data: historiques });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/produits/[id]/prix", e);
    return erreur(500, "Erreur lors de la fixation du prix.");
  }
}
