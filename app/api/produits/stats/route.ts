import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { STATUTS_DEFAUT } from "@/lib/statuts";
import { Prisma } from "@prisma/client";
import { construireFiltresProduits } from "@/lib/filtres-produits";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const isSocialMedia = acces.user.role === "social_media";
    const params = request.nextUrl.searchParams;
    
    // Le filtre de base ignore les statuts demandés dans l'URL pour garder les KPI stables,
    // mais respecte la recherche q, categorie, etc.
    const filtreBaseParams = construireFiltresProduits(params, { ignorerStatuts: true });
    
    // Filtre de base pour restreindre social_media
    const baseWhere: Prisma.ProduitWhereInput = isSocialMedia 
      ? { AND: [filtreBaseParams, { OR: [{ statut: { in: ["en_vente", "vendu"] } }, { en_vitrine: true }] }] }
      : filtreBaseParams;

    const baseWhereNonVendu: Prisma.ProduitWhereInput = {
      AND: [baseWhere, { statut: { notIn: ["vendu", "hs"] } }]
    };

    // 1. Récupération des compteurs "summary"
    // Total = tout ce qui n'est pas vendu ou HS
    const totalCount = await prisma.produit.count({ where: baseWhereNonVendu });
    
    // "disponibles" : pas vendus et fonctionnels (pas HS/à réparer/manque pièce)
    const disponiblesCount = await prisma.produit.count({
      where: {
        AND: [
          baseWhere,
          { statut: { notIn: ["vendu", "hs", "a_reparer", "manque_piece"] } }
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
          { statut: { notIn: ["vendu", "hs", "a_reparer", "manque_piece"] } }
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
    // On doit appliquer manuellement certains filtres de baseWhereNonVendu si on reste en raw sql,
    // mais c'est complexe de parser prisma where en sql.
    // Utilisons l'API prisma standard avec un NOT EXISTS sur produit_images.
    const sansPhotoCount = await prisma.produit.count({
      where: {
        AND: [
          baseWhereNonVendu,
          { image_url: null },
          { images: { none: {} } }
        ]
      }
    });

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
          baseWhere,
          { statut: { notIn: ["vendu", "hs", "a_reparer", "manque_piece"] } }
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

    // Récupérer les métadonnées des catégories (Niveau 1)
    let categorieInfos: any[] = [];
    try {
      categorieInfos = await prisma.categorieInfo.findMany();
    } catch (e) {
      console.warn("Table CategorieInfo introuvable ou erreur de DB", e);
    }
    const catInfoMap = new Map(categorieInfos.map(c => [c.nom, c]));

    const categories = categoriesGrouped.map(c => {
      const info = catInfoMap.get(c.categorie);
      return {
        name: c.categorie,
        total: c._count,
        disponibles: dispMap.get(c.categorie) || 0,
        image: info?.image_url || fallbackImages[c.categorie] || null
      };
    });

    // Récupérer l'arborescence complète des 9 Familles avec leurs enfants
    let famillesArborescence: any[] = [];
    try {
      const famillesDb = await prisma.categorie.findMany({
        where: { parent_id: null },
        include: {
          enfants: {
            include: {
              enfants: {
                include: {
                  _count: { select: { produits: true, modeles: true } },
                },
                orderBy: { ordre: "asc" },
              },
              _count: { select: { produits: true, modeles: true } },
            },
            orderBy: { ordre: "asc" },
          },
          _count: { select: { produits: true, modeles: true } },
        },
        orderBy: { ordre: "asc" },
      });

      // Calculer le total récursif de produits par famille et par catégorie
      famillesArborescence = famillesDb.map((f) => {
        let totalFamille = f._count.produits;
        let totalModelesFamille = f._count.modeles;

        const categoriesEnfants = (f.enfants || []).map((cat) => {
          let totalCat = cat._count.produits;
          let totalModelesCat = cat._count.modeles;

          const sousCats = (cat.enfants || []).map((sc) => {
            totalCat += sc._count.produits;
            totalModelesCat += sc._count.modeles;
            return {
              id: sc.id,
              nom: sc.nom,
              total: sc._count.produits,
              modelesCount: sc._count.modeles,
              image_url: sc.image_url,
            };
          });

          totalFamille += totalCat;
          totalModelesFamille += totalModelesCat;

          return {
            id: cat.id,
            nom: cat.nom,
            total: totalCat,
            modelesCount: totalModelesCat,
            image_url: cat.image_url,
            sousCategories: sousCats,
          };
        });

        return {
          id: f.id,
          nom: f.nom,
          description: f.description,
          image_url: f.image_url,
          total: totalFamille,
          modelesCount: totalModelesFamille,
          categories: categoriesEnfants,
        };
      });
    } catch (err) {
      console.warn("Erreur chargement familles arborescence:", err);
    }

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
      familles: famillesArborescence,
    });

  } catch (e) {
    console.error("GET /api/produits/stats", e);
    return erreur(500, "Erreur lors du chargement des statistiques.");
  }
}
