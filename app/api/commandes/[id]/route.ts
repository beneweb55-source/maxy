import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import type { StatutCommande, TypePaiement } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;

  try {
    const { id } = await params;
    const commandeId = Number(id);

    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
      include: {
        client: true,
        vendeur: { select: { id: true, username: true, role: true } },
        lignes: {
          include: {
            produit: true,
            modele: true,
          },
        },
      },
    });

    if (!commande) {
      return erreur(404, "Commande introuvable.");
    }

    return NextResponse.json(commande);
  } catch (e: any) {
    console.error("GET /api/commandes/[id]:", e);
    return erreur(500, e.message || "Erreur lors du chargement de la commande.");
  }
}

import { changerStatutCommande } from "@/lib/commandes";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const { id } = await params;
    const commandeId = Number(id);
    const body = await request.json();
    const { statut, type_paiement, notes } = body;

    let commandeMiseAJour;

    if (statut) {
      commandeMiseAJour = await changerStatutCommande(
        commandeId,
        statut as StatutCommande,
        user.id,
        { note: notes }
      );
    }

    if (type_paiement !== undefined || notes !== undefined) {
      commandeMiseAJour = await prisma.commande.update({
        where: { id: commandeId },
        data: {
          type_paiement: type_paiement ? (type_paiement as TypePaiement) : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
        include: {
          client: true,
          lignes: true,
          vendeur: { select: { id: true, username: true } },
        },
      });
    }

    if (!commandeMiseAJour) {
      commandeMiseAJour = await prisma.commande.findUnique({
        where: { id: commandeId },
        include: {
          client: true,
          lignes: true,
          vendeur: { select: { id: true, username: true } },
        },
      });
    }

    return NextResponse.json(commandeMiseAJour);
  } catch (e: any) {
    console.error("PATCH /api/commandes/[id]:", e);
    return erreur(500, e.message || "Erreur lors de la mise à jour de la commande.");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const { id } = await params;
    const commandeId = Number(id);

    const commande = await prisma.commande.findUnique({
      where: { id: commandeId },
      include: { lignes: true },
    });

    if (!commande) {
      return erreur(404, "Commande introuvable.");
    }

    await prisma.$transaction(async (tx) => {
      // 1. Remise en stock si la commande n'était pas déjà annulée
      if (commande.statut !== "ANNULEE") {
        for (const ligne of commande.lignes) {
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
                note: `Remise en stock suite à la suppression de la commande ${commande.numero}`,
              },
            });
          }
        }
      }

      // 2. Annulation de la facture liée si elle existe
      const factureLiee = await tx.facture.findFirst({
        where: {
          OR: [
            { numero: commande.numero },
            { lignes: { some: { produit_id: { in: commande.lignes.map((l) => l.produit_id).filter((p): p is number => p !== null) } } } },
          ],
        },
      });

      if (factureLiee) {
        await tx.facture.update({
          where: { id: factureLiee.id },
          data: { annulee: true },
        });
      }

      // 3. Suppression de la commande (les lignes_commande sont supprimées par onDelete: Cascade)
      await tx.commande.delete({
        where: { id: commandeId },
      });
    });

    await enregistrerActivite(
      prisma,
      user.id,
      ACTIONS_JOURNAL.PARAMETRES_MODIFIER,
      "commande",
      commandeId,
      {
        action: "suppression",
        numero: commande.numero,
      }
    );

    return NextResponse.json({ ok: true, message: `Commande ${commande.numero} supprimée avec succès.` });
  } catch (e: any) {
    console.error("DELETE /api/commandes/[id]:", e);
    return erreur(500, e.message || "Erreur lors de la suppression de la commande.");
  }
}

