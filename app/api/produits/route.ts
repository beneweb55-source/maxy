import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { construireFiltresProduits, construireTriProduits } from "@/lib/filtres-produits";
import { urlPhotoProduit } from "@/lib/images";
import { idsAvecCouverture } from "@/lib/images-flags";
import { validerLignesProduits, MAX_QUANTITE_PRODUITS } from "@/lib/validation";
import { creerProduitsGroupes } from "@/lib/creation-produits";

const PAR_PAGE = 50;
const JOUR_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    let where = construireFiltresProduits(params);
    // Le rôle social_media ne voit que les produits en vente, vendus ou
    // exposés en vitrine, quels que soient les filtres demandés
    // (restriction côté serveur).
    if (acces.user.role === "social_media") {
      where = {
        AND: [
          where,
          { OR: [{ statut: { in: ["en_vente", "vendu"] } }, { en_vitrine: true }] },
        ],
      };
    }
    const orderBy = construireTriProduits(params);
    const page = Math.max(1, Number(params.get("page")) || 1);

    const [total, sommeAchat, sommeReparations, produits, categories, lots] =
      await Promise.all([
        prisma.produit.count({ where }),
        prisma.produit.aggregate({ where, _sum: { prix_achat: true } }),
        prisma.reparation.aggregate({ where: { produit: where }, _sum: { cout: true } }),
        // `select` explicite : ne JAMAIS rapatrier `image_url` (photo base64)
        // pour une liste — la présence d'une photo est récupérée séparément
        // sous forme de simple booléen (voir lib/images-flags).
        prisma.produit.findMany({
          where,
          orderBy,
          skip: (page - 1) * PAR_PAGE,
          take: PAR_PAGE,
          select: {
            id: true,
            code_interne: true,
            reference: true,
            categorie: true,
            statut: true,
            a_jeter: true,
            en_vitrine: true,
            prix_achat: true,
            prix_vente_fixe: true,
            prix_vente_reel: true,
            created_at: true,
            lot: { select: { id: true, fournisseur: true, date_entree: true } },
            reparations: { select: { cout: true } },
            _count: { select: { images: true } },
          },
        }),
        prisma.produit.findMany({ distinct: ["categorie"], select: { categorie: true } }),
        prisma.lot.findMany({
          orderBy: { id: "desc" },
          select: { id: true, fournisseur: true, date_entree: true },
        }),
      ]);

    // Présence d'une photo de couverture : booléen seul, aucune image transférée.
    const avecCouverture = await idsAvecCouverture(produits.map((p) => p.id));

    const maintenant = Date.now();
    return NextResponse.json({
      total,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
      page,
      valeur: (sommeAchat._sum.prix_achat ?? 0) + (sommeReparations._sum.cout ?? 0),
      categories: categories.map((c) => c.categorie).sort(),
      lots: lots.map((l) => ({
        id: l.id,
        libelle: `n°${l.id} — ${l.fournisseur} (${l.date_entree.toLocaleDateString("fr-FR")})`,
      })),
      produits: produits.map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        categorie: p.categorie,
        statut: p.statut,
        a_jeter: p.a_jeter,
        en_vitrine: p.en_vitrine,
        prix_achat: p.prix_achat,
        image_url: avecCouverture.has(p.id) ? urlPhotoProduit(p.id) : null,
        nb_images: (avecCouverture.has(p.id) ? 1 : 0) + p._count.images,
        cout_reparations: p.reparations.reduce((s, r) => s + r.cout, 0),
        prix_vente_fixe: p.prix_vente_fixe,
        prix_vente_reel: p.prix_vente_reel,
        lot_id: p.lot?.id ?? null,
        fournisseur: p.lot?.fournisseur ?? null,
        // Sans lot, la date d'entrée est celle de création du produit.
        date_entree: (p.lot?.date_entree ?? p.created_at).toISOString(),
        jours_stock: Math.floor(
          (maintenant - (p.lot?.date_entree ?? p.created_at).getTime()) / JOUR_MS
        ),
      })),
    });
  } catch (e) {
    console.error("GET /api/produits", e);
    return erreur(500, "Erreur lors du chargement de l'inventaire.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { lot_id, reference, categorie, prix_achat, image_url, images, quantite, en_vitrine } =
    (corps ?? {}) as {
      lot_id?: unknown;
      reference?: unknown;
      categorie?: unknown;
      prix_achat?: unknown;
      image_url?: unknown;
      images?: unknown;
      quantite?: unknown;
      en_vitrine?: unknown;
    };

  const lotId = lot_id ? Number(lot_id) : null;
  if (lot_id && !Number.isInteger(lotId)) return erreur(400, "Lot invalide.");
  const validation = validerLignesProduits([{ reference, categorie, prix_achat, image_url, images }]);
  if (validation.erreur !== undefined) return erreur(400, validation.erreur);
  const ligne = validation.produits[0];
  if (!ligne) return erreur(400, "Produit invalide.");

  const qty = Math.max(1, Math.min(MAX_QUANTITE_PRODUITS, Number(quantite) || 1));

  try {
    if (lotId !== null) {
      const lot = await prisma.lot.findUnique({ where: { id: lotId } });
      if (!lot) return erreur(404, "Lot introuvable.");
    }

    // La même ligne validée est répétée `qty` fois (les éléments partagent la
    // référence du tableau `images`, aucune copie mémoire lourde).
    const lignes = Array.from({ length: qty }, () => ligne);
    const codes = await prisma.$transaction(
      (tx) =>
        creerProduitsGroupes(tx, {
          lotId: lotId,
          lignes,
          userId: user.id,
          enVitrine: en_vitrine === true,
        }),
      { timeout: 120000 }
    );

    return NextResponse.json(
      { ok: true, ajoutes: qty, code_interne: codes[0] },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/produits", e);
    return erreur(500, "Erreur lors de l'ajout du produit.");
  }
}
