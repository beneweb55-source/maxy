import { NextResponse, type NextRequest } from "next/server";
import type { TypeMouvement } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { formaterDA, sensMouvement, TYPES_MANUELS } from "@/lib/caisse";
import { ajouterMouvement, soldesCaisse } from "@/lib/caisse-db";
import { entierPositif } from "@/lib/validation";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { type, montant, description, confirmer, caisse } = (corps ?? {}) as {
    type?: unknown;
    montant?: unknown;
    description?: unknown;
    confirmer?: unknown;
    caisse?: unknown;
  };

  if (
    typeof type !== "string" ||
    !(TYPES_MANUELS as readonly string[]).includes(type)
  ) {
    return erreur(
      400,
      "Type de mouvement non autorisé en saisie manuelle (achat_lot, vente et annulation_vente sont créés par le système)."
    );
  }
  const typeMouvement = type as TypeMouvement;
  const erreurMontant = entierPositif(montant, "Le montant");
  if (erreurMontant) return erreur(400, erreurMontant);
  const montantDA = montant as number;

  try {
    const soldes = await soldesCaisse(prisma);

    if (sensMouvement(typeMouvement) === "sortie") {
      const totalApres = soldes.total - montantDA;
      if (totalApres < soldes.reserve && confirmer !== true) {
        return NextResponse.json({
          confirmation_required: true,
          message: `Cette sortie entame le fonds de réserve (${formaterDA(soldes.reserve)}) : le total passerait à ${formaterDA(totalApres)}. Confirmer ?`,
        });
      }
    }

    const mouvement = await prisma.$transaction(async (tx) => {
      const caisseCible = caisse === "CAISSE_YALIDINE" ? "CAISSE_YALIDINE" : "CAISSE_PHYSIQUE";
      const m = await ajouterMouvement(tx, {
        montant: montantDA,
        type: typeMouvement,
        user_id: user.id,
        caisse: caisseCible,
        description:
          typeof description === "string" && description.trim() ? description.trim() : undefined,
      });

      await enregistrerActivite(tx, user.id, ACTIONS_JOURNAL.CAISSE_MOUVEMENT, "caisse", m.id, {
        type: typeMouvement,
        montant: montantDA
      });

      return m;
    });

    return NextResponse.json(
      { ok: true, mouvement_id: mouvement.id, solde_apres: mouvement.solde_apres },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/caisse/mouvements", e);
    return erreur(500, "Erreur lors de l'enregistrement du mouvement.");
  }
}
