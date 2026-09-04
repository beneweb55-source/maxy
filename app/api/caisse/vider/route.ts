import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";

export async function POST() {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    // Calculer le solde actuel de la caisse physique
    const dernierMouvement = await prisma.mouvementCaisse.findFirst({
      where: { caisse: "CAISSE_PHYSIQUE" },
      orderBy: { id: "desc" },
      select: { solde_apres: true },
    });
    const soldeActuel = dernierMouvement?.solde_apres ?? 0;

    await prisma.$transaction(async (tx) => {
      // Créer un mouvement de sortie pour vider la caisse
      if (soldeActuel > 0) {
        await ajouterMouvement(tx, {
          montant: soldeActuel,
          type: "sortie",
          user_id: user.id,
          caisse: "CAISSE_PHYSIQUE",
          description: `Vidage de caisse — Solde transféré (${soldeActuel.toLocaleString("fr-DZ")} DA)`,
        });
      }

      // Enregistrer le timestamp de vidage
      await tx.parametres.update({
        where: { id: 1 },
        data: { caisse_vide_a: new Date() },
      });
    });

    return NextResponse.json({ success: true, solde: soldeActuel });
  } catch (error) {
    console.error("Erreur lors du vidage de caisse :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
