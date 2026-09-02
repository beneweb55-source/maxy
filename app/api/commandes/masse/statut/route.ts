import { type NextRequest, NextResponse } from "next/server";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { changerStatutCommande } from "@/lib/commandes";
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

    for (const id of commandeIds) {
      try {
        await changerStatutCommande(id, nouveauStatut, user.id, {
          note: "Mise à jour en masse du statut",
        });
        modifies++;
      } catch (e) {
        console.error(`Erreur mise à jour commande ${id}:`, e);
      }
    }

    return NextResponse.json({
      succes: true,
      modifies,
      statut: nouveauStatut,
    });
  } catch (e: any) {
    console.error("POST /api/commandes/masse/statut:", e);
    return erreur(500, e.message || "Erreur lors de la mise à jour en masse des statuts.");
  }
}
