import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import type { StatutCommande } from "@prisma/client";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const { ids, statut } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0 || !statut) {
      return erreur(400, "Veuillez fournir une liste d'identifiants et un statut cible valide.");
    }

    const nouveauStatut = statut as StatutCommande;
    const commandeIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);

    let modifies = 0;

    await prisma.$transaction(async (tx) => {
      const commandes = await tx.commande.findMany({
        where: { id: { in: commandeIds } },
        include: { lignes: true },
      });

      for (const cmd of commandes) {
        if (cmd.statut === nouveauStatut) continue;

        // 1. Remise en stock si annulation ou remboursement
        if (
          (nouveauStatut === "annulee" || nouveauStatut === "remboursee") &&
          cmd.statut === "payee"
        ) {
          for (const l of cmd.lignes) {
            if (l.produit_id) {
              await tx.produit.update({
                where: { id: l.produit_id },
                data: {
                  statut: "en_vente",
                  date_vente: null,
                  prix_vente_reel: null,
                },
              });

              await tx.historiqueStatut.create({
                data: {
                  produit_id: l.produit_id,
                  user_id: user.id,
                  statut_avant: "vendu",
                  statut_apres: "en_vente",
                  note: `Remise en stock suite à ${nouveauStatut} en masse de la commande ${cmd.numero}`,
                },
              });
            }
          }
        }

        // 2. Déstockage si validation payée
        if (
          nouveauStatut === "payee" &&
          (cmd.statut === "devis" || cmd.statut === "annulee" || cmd.statut === "en_attente")
        ) {
          for (const l of cmd.lignes) {
            if (l.produit_id) {
              await tx.produit.update({
                where: { id: l.produit_id },
                data: {
                  statut: "vendu",
                  date_vente: new Date(),
                  prix_vente_reel: l.prix_unitaire,
                },
              });

              await tx.historiqueStatut.create({
                data: {
                  produit_id: l.produit_id,
                  user_id: user.id,
                  statut_avant: "en_vente",
                  statut_apres: "vendu",
                  note: `Vente validée en masse sur la commande ${cmd.numero}`,
                },
              });
            }
          }
        }

        // 3. Mise à jour du statut de la commande
        await tx.commande.update({
          where: { id: cmd.id },
          data: { statut: nouveauStatut },
        });

        modifies++;
      }
    });

    await enregistrerActivite(
      prisma,
      user.id,
      ACTIONS_JOURNAL.PARAMETRES_MODIFIER,
      "commandes_masse",
      0,
      {
        statut: nouveauStatut,
        nb_commandes: modifies,
      }
    );

    return NextResponse.json({ ok: true, modifies });
  } catch (e: any) {
    console.error("POST /api/commandes/masse/statut:", e);
    return erreur(500, e.message || "Erreur lors de la mise à jour en masse des commandes.");
  }
}
