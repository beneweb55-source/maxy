import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";
import { analyserGroupe } from "@/lib/migration/moteur";

export async function POST() {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  try {
    // 1. Ingestion : Trouver tous les groupes uniques non migrés
    // On utilise Prisma groupBy pour obtenir les combinaisons de categorie et reference
    const groupes = await prisma.produit.groupBy({
      by: ['categorie', 'reference'],
      where: {
        modele_id: null // Uniquement ceux non migrés
      },
      _count: {
        _all: true
      }
    });

    let crees = 0;
    let misAJour = 0;

    // 2. Analyse de chaque groupe
    for (const groupe of groupes) {
      const { categorie, reference } = groupe;
      const nbProduits = groupe._count._all;

      // Inférence
      const proposition = analyserGroupe(categorie, reference, nbProduits);

      // On tente d'estimer l'ID de la catégorie cible si on trouve un nom exact
      // (Facultatif, aide pour le SAS)
      let categorieCibleId = null;
      for (const raison of proposition.raisons) {
        if (raison.startsWith("✓ Type détecté :")) {
          const type = raison.split(":")[1]?.trim();
          const cat = await prisma.categorie.findFirst({
            where: { nom: { equals: type, mode: 'insensitive' } }
          });
          if (cat) categorieCibleId = cat.id;
        }
      }

      // 3. Upsert dans la table de staging
      const res = await prisma.propositionMigration.upsert({
        where: { id: proposition.id },
        update: {
          cible_categorie_id: categorieCibleId,
          cible_modele_nom: proposition.cible_modele_nom,
          cible_attributs: proposition.cible_attributs ?? undefined,
          statut: proposition.statut,
          confiance: proposition.confiance,
          raisons_json: proposition.raisons,
          nb_produits: proposition.nb_produits
        },
        create: {
          id: proposition.id,
          groupe_categorie: proposition.groupe_categorie,
          groupe_reference: proposition.groupe_reference,
          cible_categorie_id: categorieCibleId,
          cible_modele_nom: proposition.cible_modele_nom,
          cible_attributs: proposition.cible_attributs ?? undefined,
          statut: proposition.statut,
          confiance: proposition.confiance,
          raisons_json: proposition.raisons,
          nb_produits: proposition.nb_produits
        }
      });

      // Simple stats (on ne peut pas vraiment savoir create vs update avec upsert sans checker avant, on compte tout)
      crees++;
    }

    return NextResponse.json({ 
      message: "Analyse terminée", 
      groupes_analyses: groupes.length,
      propositions_traitees: crees 
    });

  } catch (error) {
    console.error("Erreur POST /api/admin/migration/analyser:", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const propositions = await prisma.propositionMigration.findMany({
      orderBy: [
        { confiance: 'desc' },
        { nb_produits: 'desc' }
      ]
    });
    return NextResponse.json(propositions);
  } catch (error) {
    console.error("Erreur GET /api/admin/migration/analyser:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des propositions" }, { status: 500 });
  }
}
