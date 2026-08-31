import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

export async function GET() {
  const acces = await exigerUtilisateur(["gerant", "dev", "technicien"]);
  if (acces.reponse) return acces.reponse;

  try {
    const categories = await prisma.categorie.findMany({
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
        enfants: {
          select: { id: true },
        },
        _count: {
          select: {
            produits: true,
            modeles: true,
          },
        },
      },
      orderBy: [{ parent_id: "asc" }, { ordre: "asc" }, { nom: "asc" }],
    });

    const tableauPlat = categories.map((c) => {
      let niveau = 1;
      let chemin = c.nom;
      let familleNom = "";
      let categorieParenteNom = "";

      if (c.parent) {
        if (c.parent.parent) {
          niveau = 3;
          familleNom = c.parent.parent.nom;
          categorieParenteNom = c.parent.nom;
          chemin = `${familleNom} > ${categorieParenteNom} > ${c.nom}`;
        } else {
          niveau = 2;
          familleNom = c.parent.nom;
          chemin = `${familleNom} > ${c.nom}`;
        }
      } else {
        familleNom = c.nom;
      }

      const totalProduits = c._count.produits;
      let statut: "vide" | "optimal" | "charge" | "surpeuple" = "optimal";
      if (totalProduits === 0) {
        statut = "vide";
      } else if (totalProduits > 100) {
        statut = "surpeuple";
      } else if (totalProduits > 50) {
        statut = "charge";
      }

      return {
        id: c.id,
        nom: c.nom,
        niveau,
        chemin_complet: chemin,
        famille_nom: familleNom,
        parent_id: c.parent_id,
        parent_nom: c.parent?.nom || null,
        produits_count: totalProduits,
        modeles_count: c._count.modeles,
        enfants_count: c.enfants.length,
        statut,
      };
    });

    // Statistiques globales
    const resume = {
      total: tableauPlat.length,
      vides: tableauPlat.filter((c) => c.statut === "vide").length,
      optimales: tableauPlat.filter((c) => c.statut === "optimal").length,
      chargees: tableauPlat.filter((c) => c.statut === "charge").length,
      surpeuplees: tableauPlat.filter((c) => c.statut === "surpeuple").length,
    };

    return NextResponse.json({
      resume,
      categories: tableauPlat,
    });
  } catch (error) {
    console.error("Erreur GET /api/admin/audit-categories:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération de l'audit" },
      { status: 500 }
    );
  }
}
