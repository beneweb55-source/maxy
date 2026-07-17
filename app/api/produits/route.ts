import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { genererCodesInternes } from "@/lib/codes";
import { construireFiltresProduits, construireTriProduits } from "@/lib/filtres-produits";
import { urlPhotoProduit } from "@/lib/images";
import { validerLignesProduits } from "@/lib/validation";

const PAR_PAGE = 50;
const JOUR_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    const where = construireFiltresProduits(params);
    const orderBy = construireTriProduits(params);
    const page = Math.max(1, Number(params.get("page")) || 1);

    const [total, sommeAchat, sommeReparations, produits, categories, lots] =
      await Promise.all([
        prisma.produit.count({ where }),
        prisma.produit.aggregate({ where, _sum: { prix_achat: true } }),
        prisma.reparation.aggregate({ where: { produit: where }, _sum: { cout: true } }),
        prisma.produit.findMany({
          where,
          orderBy,
          skip: (page - 1) * PAR_PAGE,
          take: PAR_PAGE,
          include: {
            lot: { select: { id: true, fournisseur: true, date_entree: true } },
            reparations: { select: { cout: true } },
          },
        }),
        prisma.produit.findMany({ distinct: ["categorie"], select: { categorie: true } }),
        prisma.lot.findMany({
          orderBy: { id: "desc" },
          select: { id: true, fournisseur: true, date_entree: true },
        }),
      ]);

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
        prix_achat: p.prix_achat,
        image_url: p.image_url ? urlPhotoProduit(p.id) : null,
        cout_reparations: p.reparations.reduce((s, r) => s + r.cout, 0),
        prix_vente_fixe: p.prix_vente_fixe,
        prix_vente_reel: p.prix_vente_reel,
        lot_id: p.lot.id,
        fournisseur: p.lot.fournisseur,
        date_entree: p.lot.date_entree.toISOString(),
        jours_stock: Math.floor((maintenant - p.lot.date_entree.getTime()) / JOUR_MS),
      })),
    });
  } catch (e) {
    console.error("GET /api/produits", e);
    return erreur(500, "Erreur lors du chargement de l'inventaire.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { lot_id, reference, categorie, prix_achat, image_url } = (corps ?? {}) as {
    lot_id?: unknown;
    reference?: unknown;
    categorie?: unknown;
    prix_achat?: unknown;
    image_url?: unknown;
  };

  const lotId = Number(lot_id);
  if (!Number.isInteger(lotId)) return erreur(400, "Choisissez le lot de rattachement.");
  const validation = validerLignesProduits([{ reference, categorie, prix_achat, image_url }]);
  if (validation.erreur !== undefined) return erreur(400, validation.erreur);
  const ligne = validation.produits[0];
  if (!ligne) return erreur(400, "Produit invalide.");

  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) return erreur(404, "Lot introuvable.");

    const produit = await prisma.$transaction(async (tx) => {
      const [code] = await genererCodesInternes(tx, 1);
      const cree = await tx.produit.create({
        data: {
          lot_id: lot.id,
          code_interne: code ?? "P-0001",
          reference: ligne.reference,
          categorie: ligne.categorie,
          prix_achat: ligne.prix_achat,
          image_url: ligne.image_url ?? null,
        },
      });
      await tx.historiqueStatut.create({
        data: {
          produit_id: cree.id,
          user_id: user.id,
          statut_avant: null,
          statut_apres: "recu",
        },
      });
      return cree;
    });

    return NextResponse.json(
      { ok: true, id: produit.id, code_interne: produit.code_interne },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/produits", e);
    return erreur(500, "Erreur lors de l'ajout du produit.");
  }
}
