import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const produits = await prisma.produit.findMany({
      where: { modele_id: { not: null } },
      include: { modele: { include: { categorie: true } } }
    });

    let up = 0;
    // DÉSACTIVÉ PAR SÉCURITÉ POUR NE PAS PERDRE L'APPELLATION D'ORIGINE
    /*
    for (const p of produits) {
      if (p.modele && p.modele.categorie) {
        const nouveauCat = p.modele.categorie.nom;
        const nouvelleRef = p.modele.nom;

        if (p.categorie !== nouveauCat || p.reference !== nouvelleRef) {
          await prisma.produit.update({
            where: { id: p.id },
            data: {
              categorie: nouveauCat,
              reference: nouvelleRef
            }
          });
          up++;
        }
      }
    }
    */

    return NextResponse.json({
      success: true,
      message: `Correction terminée. ${up} produits mis à jour.`,
      mis_a_jour: up
    });
  } catch (error) {
    console.error("Erreur lors de la correction:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
