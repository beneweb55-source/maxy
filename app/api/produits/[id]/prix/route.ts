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
      await tx.produit.update({
        where: { id: produit.id },
        data: { prix_vente_fixe: prix, statut: "en_vente" },
      });
      await tx.historiqueStatut.create({
        data: {
          produit_id: produit.id,
          user_id: user.id,
          statut_avant: "ok",
          statut_apres: "en_vente",
          note: `Prix fixé : ${formaterDA(prix)}`,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/produits/[id]/prix", e);
    return erreur(500, "Erreur lors de la fixation du prix.");
  }
}
