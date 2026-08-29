import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propositionIds } = body;

    if (!Array.isArray(propositionIds) || propositionIds.length === 0) {
      return NextResponse.json({ error: "Aucune proposition fournie" }, { status: 400 });
    }

    const propositions = await prisma.propositionMigration.findMany({
      where: {
        id: { in: propositionIds },
        statut: "valide" // On ne traite que ce qui a été explicitement validé par l'humain
      }
    });

    if (propositions.length === 0) {
      return NextResponse.json({ error: "Aucune proposition valide trouvée parmi les IDs fournis" }, { status: 400 });
    }

    const batchId = crypto.randomUUID();
    const resultats = { appliques: 0, modeles_crees: 0, erreurs: 0 };

    for (const prop of propositions) {
      try {
        if (!prop.cible_categorie_id || !prop.cible_modele_nom) {
          throw new Error("Proposition incomplète (catégorie ou modèle manquant)");
        }

        // Transaction unitaire pour chaque proposition pour éviter qu'une erreur bloque tout le lot
        await prisma.$transaction(async (tx) => {
          // 1. Chercher ou créer le Modèle cible
          let modele = await tx.modele.findFirst({
            where: {
              categorie_id: prop.cible_categorie_id!,
              nom: { equals: prop.cible_modele_nom!, mode: 'insensitive' }
            }
          });

          if (!modele) {
            modele = await tx.modele.create({
              data: {
                categorie_id: prop.cible_categorie_id!,
                nom: prop.cible_modele_nom!,
                attributs: prop.cible_attributs ?? undefined
              }
            });
            resultats.modeles_crees++;
          }

          // 2. Trouver les produits à migrer
          const produits = await tx.produit.findMany({
            where: {
              categorie: prop.groupe_categorie,
              reference: prop.groupe_reference,
              modele_id: null
            }
          });

          if (produits.length > 0) {
            // 3. Insérer les logs pour le rollback
            await tx.migrationLog.createMany({
              data: produits.map(p => ({
                batch_id: batchId,
                produit_id: p.id,
                modele_id_avant: null,
                modele_id_apres: modele!.id
              }))
            });

            // 4. Mettre à jour les produits
            await tx.produit.updateMany({
              where: {
                id: { in: produits.map(p => p.id) }
              },
              data: {
                modele_id: modele.id
              }
            });
            
            resultats.appliques += produits.length;
          }

          // 5. Supprimer la proposition de la file d'attente (ou la marquer comme archivée)
          await tx.propositionMigration.delete({
            where: { id: prop.id }
          });
        });
      } catch (e) {
        console.error(`Erreur application proposition ${prop.id}:`, e);
        resultats.erreurs++;
      }
    }

    return NextResponse.json({
      message: "Application terminée",
      batch_id: batchId,
      ...resultats
    });

  } catch (error) {
    console.error("Erreur POST /api/admin/migration/appliquer:", error);
    return NextResponse.json({ error: "Erreur lors de l'application" }, { status: 500 });
  }
}
