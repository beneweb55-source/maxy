import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return erreur(400, "Veuillez fournir une liste d'identifiants à supprimer.");
    }

    const commandeIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);

    let supprimes = 0;

    await prisma.$transaction(async (tx) => {
      const commandes = await tx.commande.findMany({
        where: { id: { in: commandeIds } },
        include: { lignes: true },
      });

      for (const cmd of commandes) {
        // 1. Remise en stock si la commande n'était pas déjà annulée
        if (cmd.statut !== "ANNULEE") {
          for (const ligne of cmd.lignes) {
            if (ligne.produit_id) {
              await tx.produit.update({
                where: { id: ligne.produit_id },
                data: {
                  statut: "en_vente",
                  date_vente: null,
                  prix_vente_reel: null,
                },
              });

              await tx.historiqueStatut.create({
                data: {
                  produit_id: ligne.produit_id,
                  user_id: user.id,
                  statut_avant: "vendu",
                  statut_apres: "en_vente",
                  note: `Remise en stock suite à la suppression en masse de la commande ${cmd.numero}`,
                },
              });
            }
          }
        }

        // 2. Annulation de la facture liée
        const factureLiee = await tx.facture.findFirst({
          where: {
            OR: [
              { numero: cmd.numero },
              { lignes: { some: { produit_id: { in: cmd.lignes.map((l) => l.produit_id).filter((p): p is number => p !== null) } } } },
            ],
          },
        });

        if (factureLiee) {
          await tx.facture.update({
            where: { id: factureLiee.id },
            data: { annulee: true },
          });
        }

        // 3. Suppression de la commande
        await tx.commande.delete({
          where: { id: cmd.id },
        });

        supprimes++;
      }
    });

    await enregistrerActivite(
      prisma,
      user.id,
      ACTIONS_JOURNAL.PARAMETRES_MODIFIER,
      "commandes_masse",
      0,
      {
        action: "suppression_masse",
        nb_commandes: supprimes,
      }
    );

    return NextResponse.json({ ok: true, supprimes });
  } catch (e: any) {
    console.error("POST /api/commandes/masse/suppression:", e);
    return erreur(500, e.message || "Erreur lors de la suppression en masse des commandes.");
  }
}
