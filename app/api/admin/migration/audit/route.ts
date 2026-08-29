import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const totalProduits = await prisma.produit.count();
    
    // 1. Audit des Modèles et de leurs attributs "Details"
    const modeles = await prisma.modele.findMany({
      include: {
        categorie: { include: { parent: true } },
        exemplaires: {
          select: { id: true, code_interne: true, reference: true, categorie: true }
        }
      }
    });

    // 2. Audit des propositions (si elles existent encore)
    const propositions = await prisma.propositionMigration.findMany();

    // 3. Catégorisation des données
    const stats = {
      niveauA_exactement_recuperable: 0,
      niveauB_reconstructible: 0, 
      niveauC_ambigu: 0,
      niveauD_perdu: 0,
    };

    const detailsPerdus: any[] = [];
    const detailsRecuperables: any[] = [];
    const donneesConservees: any[] = [];
    const modelesGeneriques: any[] = [];

    for (const m of modeles) {
      const attrs = m.attributs as any;
      const originalRef = attrs?.Details;

      const nbExemplaires = m.exemplaires.length;
      if (nbExemplaires === 0) continue;

      if (originalRef) {
        // On a une trace de l'ancienne référence dans "Details" du modèle !
        stats.niveauA_exactement_recuperable += nbExemplaires;
        detailsRecuperables.push({
          produit_actuel: `${m.categorie?.nom || ''} / ${m.nom}`,
          donnee_originale: originalRef,
          nb_exemplaires: nbExemplaires,
          action: "Restaurer depuis Modele.attributs.Details"
        });
      } else {
        // Pas de trace dans "Details"
        // Est-ce qu'on peut reconstruire à partir de la PropositionMigration ?
        const propsPourModele = propositions.filter(p => p.cible_modele_nom === m.nom && p.cible_categorie_id === m.categorie_id);
        
        if (propsPourModele.length === 1) {
          stats.niveauB_reconstructible += nbExemplaires;
          detailsRecuperables.push({
            produit_actuel: `${m.categorie?.nom || ''} / ${m.nom}`,
            donnee_originale: propsPourModele[0].groupe_reference,
            nb_exemplaires: nbExemplaires,
            action: "Restaurer depuis PropositionMigration"
          });
        } else if (propsPourModele.length > 1) {
          stats.niveauC_ambigu += nbExemplaires;
          modelesGeneriques.push({
            produit_actuel: m.nom,
            nb_exemplaires: nbExemplaires,
            anciennes_references_possibles: propsPourModele.map(p => p.groupe_reference)
          });
        } else {
          stats.niveauD_perdu += nbExemplaires;
          detailsPerdus.push({
            produit_actuel: m.nom,
            nb_exemplaires: nbExemplaires,
            cause: "Aucune trace dans Modele ni PropositionMigration"
          });
        }
      }
    }

    // 4. Génération du Rapport
    const rapport = {
      RESUME: `Analyse de ${totalProduits} produits migrés.`,
      NIVEAUX_DE_RESTAURATION: stats,
      PARTIE_A_CONSERVES: donneesConservees.length > 0 ? donneesConservees : "Toutes les références ont été écrasées par le script 'fix'.",
      PARTIE_B_GENERALISES_AMBIGUS: modelesGeneriques,
      PARTIE_C_RESTAURABLES: detailsRecuperables,
      PARTIE_D_PERDUS: detailsPerdus,
    };

    return NextResponse.json(rapport);
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
