import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { construireFiltresProduits, construireTriProduits } from "@/lib/filtres-produits";
import { urlCouverture } from "@/lib/images-flags";
import { STATUTS_DEFAUT } from "@/lib/statuts";

const PAR_PAGE = 50;

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    let where = construireFiltresProduits(params);
    
    if (acces.user.role === "social_media") {
      where = {
        AND: [
          where,
          { OR: [{ statut: { in: ["en_vente", "vendu"] } }, { en_vitrine: true }] },
        ],
      };
    }
    
    const page = Math.max(1, Number(params.get("page")) || 1);
    
    // Pour la pagination totale, il faut compter le nombre distinct de (reference, categorie)
    // Prisma ne supporte pas count(distinct) sur plusieurs colonnes facilement.
    // On peut utiliser raw SQL ou groupBy.
    const countResult = await prisma.produit.groupBy({
      by: ["reference", "categorie"],
      where,
    });
    const total = countResult.length;

    // 1. Récupérer les familles paginées via findMany avec distinct
    const famillesBases = await prisma.produit.findMany({
      where,
      distinct: ["reference", "categorie"],
      select: {
        id: true, // pour urlCouverture
        reference: true,
        categorie: true,
        image_url: true,
        _count: { select: { images: true } }
      },
      orderBy: { reference: "asc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE
    });

    if (famillesBases.length === 0) {
      return NextResponse.json({
        total: 0,
        pages: 0,
        page,
        familles: []
      });
    }

    // 2. Pour ces familles, on récupère les agrégations (comptes, prix)
    // On construit un OR avec les (reference, categorie)
    const famillesFiltre = {
      OR: famillesBases.map(f => ({
        reference: f.reference,
        categorie: f.categorie
      }))
    };

    const statsWhere = { AND: [where, famillesFiltre] };

    const stats = await prisma.produit.groupBy({
      by: ["reference", "categorie"],
      where: statsWhere,
      _count: { id: true },
      _min: { prix_achat: true, prix_vente_fixe: true, prix_vente_reel: true },
      _max: { prix_achat: true, prix_vente_fixe: true, prix_vente_reel: true },
    });

    // Compter les disponibles
    const statsDispos = await prisma.produit.groupBy({
      by: ["reference", "categorie"],
      where: {
        AND: [
          statsWhere,
          { statut: { notIn: ["vendu", ...STATUTS_DEFAUT] } }
        ]
      },
      _count: { id: true }
    });
    
    // Compter les à tester
    const statsTester = await prisma.produit.groupBy({
      by: ["reference", "categorie"],
      where: {
        AND: [statsWhere, { statut: "en_test" }]
      },
      _count: { id: true }
    });

    const disposMap = new Map(statsDispos.map(s => [`${s.reference}|${s.categorie}`, s._count.id]));
    const testerMap = new Map(statsTester.map(s => [`${s.reference}|${s.categorie}`, s._count.id]));
    const statsMap = new Map(stats.map(s => [`${s.reference}|${s.categorie}`, s]));

    const familles = famillesBases.map(fb => {
      const cle = `${fb.reference}|${fb.categorie}`;
      const st = statsMap.get(cle);
      
      // Construire l'URL de l'image si image_url existe 
      // (simplification de couverturesProduits pour éviter de tout importer si non nécessaire)
      // Normalement on utilise le flag :
      const image_url = fb.image_url?.startsWith('http') 
        ? fb.image_url 
        : (fb.image_url ? `/api/produits/${fb.id}/image` : null);

      return {
        cle,
        reference: fb.reference,
        categorie: fb.categorie,
        image_url,
        nbImages: fb._count.images + (fb.image_url ? 1 : 0),
        
        unites: st?._count.id || 0,
        disponibles: disposMap.get(cle) || 0,
        a_tester: testerMap.get(cle) || 0,

        prixMin: st?._min.prix_achat ?? 0,
        prixMax: st?._max.prix_achat ?? 0,
        venteMin: st?._min.prix_vente_fixe ?? null, // Simplification : on prend le prix fixe
        venteMax: st?._max.prix_vente_fixe ?? null,
      };
    });

    return NextResponse.json({
      total,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
      page,
      familles,
    });
    
  } catch (e) {
    console.error("GET /api/produits/familles", e);
    return erreur(500, "Erreur lors du chargement des familles.");
  }
}
