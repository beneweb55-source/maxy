import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { STATUTS_DEFAUT } from "@/lib/statuts";
import { Prisma } from "@prisma/client";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const isSocialMedia = acces.user.role === "social_media";
    
    // Filtre de base pour restreindre social_media
    const baseWhere: Prisma.ProduitWhereInput = isSocialMedia 
      ? { OR: [{ statut: { in: ["en_vente", "vendu"] } }, { en_vitrine: true }] }
      : {};

    const baseWhereNonVendu: Prisma.ProduitWhereInput = {
      AND: [baseWhere, { statut: { not: "vendu" } }]
    };

    // 1. Récupération des compteurs "summary"
    const totalCount = await prisma.produit.count({ where: baseWhere });
    
    // "disponibles" : pas vendus et fonctionnels (pas HS/à réparer/manque pièce)
    const disponiblesCount = await prisma.produit.count({
      where: {
        AND: [
          baseWhere,
          { statut: { notIn: ["vendu", ...STATUTS_DEFAUT] } }
        ]
      }
    });

    const enVenteCount = await prisma.produit.count({
      where: { AND: [baseWhere, { statut: "en_vente" }] }
    });

    // 2. Récupération des compteurs "actions"
    const sansPrixCount = await prisma.produit.count({
      where: {
        AND: [
          baseWhereNonVendu,
          { prix_vente_fixe: null },
          // Seulement les produits pertinents à tarifer (ex: OK, en_vente, recu)
          { statut: { notIn: [...STATUTS_DEFAUT] } }
        ]
      }
    });

    const aTesterCount = await prisma.produit.count({
      where: { AND: [baseWhereNonVendu, { statut: "en_test" }] }
    });

    const aReparerCount = await prisma.produit.count({
      where: { AND: [baseWhereNonVendu, { statut: "a_reparer" }] }
    });

    const sansEtiquetteCount = await prisma.produit.count({
      where: { AND: [baseWhereNonVendu, { etiquette_imprimee: false }] }
    });

    // Pour les photos, on compte ceux avec image_url NULL 
    // et sans images dans galerie
    // On ajoute 'isSocialMedia' condition in raw sql just in case, but social media wouldn't normally process this
    // It's safer to just do basic WHERE
    const sansPhotoResult = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(p.id) as count
      FROM produits p
      LEFT JOIN produit_images pi ON p.id = pi.produit_id
      WHERE p.statut != 'vendu'
      AND p.image_url IS NULL 
      AND pi.id IS NULL
    `;
    const sansPhotoCount = Number(sansPhotoResult[0]?.count || 0);

    // 3. Récupération des catégories (group by)
    const categoriesGrouped = await prisma.produit.groupBy({
      by: ["categorie"],
      where: baseWhereNonVendu,
      _count: true,
    });

    // Récupérer le compte des disponibles par catégorie
    const categoriesDisponiblesGrouped = await prisma.produit.groupBy({
      by: ["categorie"],
      where: {
        AND: [
          baseWhereNonVendu,
          { statut: { notIn: STATUTS_DEFAUT } }
        ]
      },
      _count: true,
    });

    const dispMap = new Map(categoriesDisponiblesGrouped.map(c => [c.categorie, c._count]));

    // Récupérer la 1ère image (fallback) par catégorie
    const fallbackImages: Record<string, string | null> = {};
    const imgQuery = await prisma.$queryRaw<{ categorie: string, id: number, url: string | null }[]>`
      SELECT p1.categorie, p1.id, 
             CASE WHEN p1.image_url LIKE 'http%' THEN p1.image_url ELSE NULL END AS url
      FROM produits p1
      INNER JOIN (
          SELECT categorie, MIN(id) as first_id
          FROM produits
          WHERE image_url IS NOT NULL AND statut != 'vendu'
          GROUP BY categorie
      ) p2 ON p1.id = p2.first_id
    `;
    
    for (const img of imgQuery) {
      fallbackImages[img.categorie] = img.url ?? `/api/produits/${img.id}/image`;
    }

    const categories = categoriesGrouped.map(c => ({
      name: c.categorie,
      total: c._count,
      disponibles: dispMap.get(c.categorie) || 0,
      image: fallbackImages[c.categorie] || null // image statique à rajouter coté client
    }));

    // Trier les catégories par nombre total (décroissant)
    categories.sort((a, b) => b.total - a.total);

    return NextResponse.json({
      summary: {
        total: totalCount,
        disponibles: disponiblesCount,
        en_vente: enVenteCount,
      },
      actions: {
        sans_prix: sansPrixCount,
        a_tester: aTesterCount,
        a_reparer: aReparerCount,
        sans_photo: sansPhotoCount,
        sans_etiquette: sansEtiquetteCount,
      },
      categories,
    });

  } catch (e) {
    console.error("GET /api/produits/stats", e);
    return erreur(500, "Erreur lors du chargement des statistiques.");
  }
}
