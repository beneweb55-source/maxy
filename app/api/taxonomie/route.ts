import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";
import { classifierProduit, NoeudTaxonomie } from "@/lib/taxonomie";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    // We only need specific fields to classify
    const produits = await prisma.produit.findMany({
      where: { 
        statut: { not: "vendu" } // Exclure les vendus si on veut que le stock réel
      },
      select: {
        id: true,
        reference: true,
        categorie: true,
        code_interne: true,
        image_url: true
      }
    });

    const arbre: Record<string, NoeudTaxonomie> = {};
    let total = 0;

    for (const prod of produits) {
      const classification = classifierProduit(prod);
      
      const f = classification.famille;
      const c = classification.categorie;
      const s = classification.sousCategorie;
      
      // Init Famille
      if (!arbre[f]) arbre[f] = { nom: f, icone: classification.iconeFamille, enfants: {}, count: 0 };
      arbre[f].count = (arbre[f].count || 0) + 1;
      
      // Init Catégorie
      if (!arbre[f].enfants![c]) arbre[f].enfants![c] = { nom: c, icone: classification.iconeFamille, enfants: {}, count: 0 };
      arbre[f].enfants![c].count = (arbre[f].enfants![c].count || 0) + 1;
      
      // Init Sous-catégorie
      if (!arbre[f].enfants![c].enfants![s]) arbre[f].enfants![c].enfants![s] = { nom: s, count: 0 };
      arbre[f].enfants![c].enfants![s].count = (arbre[f].enfants![c].enfants![s].count || 0) + 1;
      
      total++;
    }

    return NextResponse.json({ arbre, total });
  } catch (error) {
    console.error("Erreur GET /api/taxonomie:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
