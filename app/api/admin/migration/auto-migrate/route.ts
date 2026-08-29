import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { analyserGroupe } from "@/lib/migration/moteur";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const groupes = await prisma.produit.groupBy({
      by: ['categorie', 'reference'],
      where: { modele_id: null },
      _count: { _all: true }
    });

    let migres = 0;
    let ignores = 0;

    for (const groupe of groupes) {
      const categorieLegacy = groupe.categorie;
      const referenceLegacy = groupe.reference;
      const nbProduits = groupe._count._all;

      const analyse = analyserGroupe(categorieLegacy, referenceLegacy, nbProduits);

      if (analyse.statut === "conflit" || analyse.confiance < 50 || !analyse.cible_famille_nom || !analyse.cible_categorie_nom) {
        ignores += nbProduits;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        let famille = await tx.categorie.findFirst({
          where: { nom: analyse.cible_famille_nom!, parent_id: null }
        });
        if (!famille) {
          famille = await tx.categorie.create({
            data: { nom: analyse.cible_famille_nom!, ordre: 0 }
          });
        }

        let categorie = await tx.categorie.findFirst({
          where: { nom: analyse.cible_categorie_nom!, parent_id: famille.id }
        });
        if (!categorie) {
          categorie = await tx.categorie.create({
            data: { nom: analyse.cible_categorie_nom!, parent_id: famille.id, ordre: 0 }
          });
        }

        let modele = await tx.modele.findFirst({
          where: { nom: analyse.cible_modele_nom!, categorie_id: categorie.id }
        });
        if (!modele) {
          modele = await tx.modele.create({
            data: {
              nom: analyse.cible_modele_nom!,
              categorie_id: categorie.id,
              attributs: analyse.cible_attributs ?? undefined
            }
          });
        }

        await tx.produit.updateMany({
          where: {
            categorie: categorieLegacy,
            reference: referenceLegacy,
            modele_id: null
          },
          data: {
            modele_id: modele.id
          }
        });
      });

      migres += nbProduits;
    }

    return NextResponse.json({
      success: true,
      message: "Migration automatique terminée",
      migres,
      ignores,
      total_groupes: groupes.length
    });
  } catch (error) {
    console.error("Erreur lors de la migration auto:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
