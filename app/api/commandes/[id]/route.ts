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

    const commandeExistante = await prisma.commande.findUnique({
      where: { id: commandeId },
      include: { lignes: true },
    });

    if (!commandeExistante) {
      return erreur(404, "Commande introuvable.");
    }

    const nouveauStatut = statut as StatutCommande;

    const commandeMiseAJour = await prisma.$transaction(async (tx) => {
      // 1. Si la commande passe à "annulee" ou "remboursee", on remet les exemplaires physiques en stock (statut = "en_vente")
      if (
        (nouveauStatut === "annulee" || nouveauStatut === "remboursee") &&
        commandeExistante.statut !== "annulee" &&
        commandeExistante.statut !== "remboursee"
      ) {
        for (const ligne of commandeExistante.lignes) {
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
                note: `Remise en stock suite à ${nouveauStatut} de la commande ${commandeExistante.numero}`,
              },
            });
          }
        }
      }

      // 2. Si un devis ou commande annulée repasse à "payee", on redéstocke
      if (
        nouveauStatut === "payee" &&
        (commandeExistante.statut === "devis" || commandeExistante.statut === "annulee")
      ) {
        for (const ligne of commandeExistante.lignes) {
          if (ligne.produit_id) {
            await tx.produit.update({
              where: { id: ligne.produit_id },
              data: {
                statut: "vendu",
                date_vente: new Date(),
                prix_vente_reel: ligne.prix_unitaire,
              },
            });

            await tx.historiqueStatut.create({
              data: {
                produit_id: ligne.produit_id,
                user_id: user.id,
                statut_avant: "en_vente",
                statut_apres: "vendu",
                note: `Vente validée sur la commande ${commandeExistante.numero}`,
              },
            });
          }
        }
      }

      // 3. Mise à jour de la commande
      return tx.commande.update({
        where: { id: commandeId },
        data: {
          statut: nouveauStatut || undefined,
          type_paiement: (type_paiement as TypePaiement) || undefined,
          notes: notes !== undefined ? notes : undefined,
        },
        include: {
          client: true,
          lignes: true,
          vendeur: { select: { id: true, username: true } },
        },
      });
    });

    return NextResponse.json(commandeMiseAJour);
  } catch (e: any) {
    console.error("PATCH /api/commandes/[id]:", e);
    return erreur(500, e.message || "Erreur lors de la mise à jour de la commande.");
  }
}
