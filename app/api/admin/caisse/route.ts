import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { formaterDA } from "@/lib/caisse";
import { ajouterMouvement, soldesCaisse } from "@/lib/caisse-db";

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
  const { nouveau_solde, motif, confirmer } = (corps ?? {}) as {
    nouveau_solde?: unknown;
    motif?: unknown;
    confirmer?: unknown;
  };

  if (
    typeof nouveau_solde !== "number" ||
    !Number.isInteger(nouveau_solde) ||
    nouveau_solde < 0
  ) {
    return erreur(400, "Le nouveau solde doit être un entier positif en DA.");
  }
  if (typeof motif !== "string" || !motif.trim()) {
    return erreur(400, "Le motif de l'ajustement est obligatoire (traçabilité).");
  }

  try {
    const soldes = await soldesCaisse(prisma);
    const delta = nouveau_solde - soldes.total;
    if (delta === 0) {
      return erreur(400, `Le solde total est déjà de ${formaterDA(soldes.total)}.`);
    }

    if (confirmer !== true) {
      return NextResponse.json({
        confirmation_required: true,
        message: `Le solde total passera de ${formaterDA(soldes.total)} à ${formaterDA(nouveau_solde)} (${delta > 0 ? "+" : "−"}${formaterDA(Math.abs(delta))}). Un mouvement d'ajustement tracé sera créé. Confirmer ?`,
      });
    }

    const mouvement = await prisma.$transaction((tx) =>
      ajouterMouvement(tx, {
        montant: Math.abs(delta),
        type: delta > 0 ? "apport_associe" : "frais",
        user_id: user.id,
        description: `Ajustement administratif du solde — ${motif.trim()}`,
      })
    );

    return NextResponse.json(
      { ok: true, mouvement_id: mouvement.id, solde_apres: mouvement.solde_apres },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/admin/caisse", e);
    return erreur(500, "Erreur lors de l'ajustement de la caisse.");
  }
}
