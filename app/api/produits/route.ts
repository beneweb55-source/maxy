import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { construireFiltresProduits, construireTriProduits } from "@/lib/filtres-produits";
import { urlPhotoProduit } from "@/lib/images";
import { couverturesProduits, urlCouverture } from "@/lib/images-flags";
import { televerserLignes } from "@/lib/stockage-images";
import { validerLignesProduits, MAX_QUANTITE_PRODUITS } from "@/lib/validation";
import { creerProduitsGroupes } from "@/lib/creation-produits";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import { StockService } from "@/lib/stock-service";
import type { StatutProduit } from "@prisma/client";

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

    const grouper = params.get("grouper") === "1";

    let totalProduits = 0;
    let sommeAchatResult = { _sum: { prix_achat: 0 as number | null } };
    let sommeReparationsResult = { _sum: { cout: 0 as number | null } };
    let categoriesResult: { nom: string }[] = [];
    let lotsResult: { id: number; fournisseur: string; date_entree: Date }[] = [];
    let produits: {
      id: number;
      code_interne: string;
      reference: string;
      categorie: string;
      categorie_id: number | null;
      categorie_rel?: { nom: string; parent: { nom: string; parent: { nom: string } | null } | null } | null;
      modele_id?: number | null;
      modele?: { id: number; nom: string; image_url: string | null } | null;
      statut: string | StatutProduit;
      a_jeter: boolean;
      en_vitrine: boolean;
      poste_reseaux: boolean;
      prix_achat: number;
      prix_vente_fixe: number | null;
      prix_vente_reel: number | null;
      created_at: Date;
      etiquette_imprimee: boolean;
      numero_serie?: string | null;
      grade?: string | null;
      emplacement?: string | null;
      lot: { id: number; fournisseur: string; date_entree: Date } | null;
      reparations: { cout: number }[];
      _count: { images: number; composants: number };
      est_compose?: boolean;
      parent_id?: number | null;
    }[] = [];
    let totalPages = 1;

    if (grouper) {
      // 1. Pagination basée sur les groupes (familles)
      const countGroups = await prisma.produit.groupBy({ by: ["reference", "categorie_id", "categorie"], where });
      const totalGroups = countGroups.length;
      totalPages = Math.max(1, Math.ceil(totalGroups / PAR_PAGE));

      const distinctRefs = await prisma.produit.findMany({
        where,
        distinct: ["reference", "categorie_id", "categorie"],
        select: { reference: true, categorie_id: true, categorie: true },
        orderBy: { reference: "asc" },
        skip: (page - 1) * PAR_PAGE,
        take: PAR_PAGE,
      });

      const refFilter = distinctRefs.length > 0 
        ? { OR: distinctRefs.map((r) => ({ reference: r.reference, categorie_id: r.categorie_id, categorie: r.categorie })) }
        : { id: -1 }; // Force empty if no groups

      const [totalCount, sommeAchat, sommeReparations, fetchedProduits, categories, lots] = await Promise.all([
        prisma.produit.count({ where }).catch(() => 0),
        prisma.produit.aggregate({ where, _sum: { prix_achat: true } }).catch(() => ({ _sum: { prix_achat: 0 } })),
        prisma.reparation.aggregate({ where: { produit: where }, _sum: { cout: true } }).catch(() => ({ _sum: { cout: 0 } })),
        prisma.produit.findMany({
          where: { AND: [where, refFilter] },
          orderBy,
          select: {
            id: true, code_interne: true, reference: true, categorie: true, categorie_id: true,
            categorie_rel: { select: { nom: true, parent: { select: { nom: true, parent: { select: { nom: true } } } } } },
            modele_id: true,
            modele: { select: { id: true, nom: true, image_url: true } },
            statut: true, a_jeter: true, en_vitrine: true, prix_achat: true,
            prix_vente_fixe: true, prix_vente_reel: true, created_at: true,
            etiquette_imprimee: true, poste_reseaux: true, lot: { select: { id: true, fournisseur: true, date_entree: true } },
            reparations: { select: { cout: true } }, _count: { select: { images: true, composants: true } },
            est_compose: true, parent_id: true,
          },
        }),
        prisma.categorie.findMany({ where: { parent_id: null }, select: { nom: true } }).catch(() => []),
        prisma.lot.findMany({ orderBy: { id: "desc" }, select: { id: true, fournisseur: true, date_entree: true } }).catch(() => []),
      ]);
      totalProduits = totalCount;
      sommeAchatResult = sommeAchat;
      sommeReparationsResult = sommeReparations;
      produits = fetchedProduits;
      categoriesResult = categories;
      lotsResult = lots;
    } else {
      // Pagination standard par item
      const [totalCount, sommeAchat, sommeReparations, fetchedProduits, categories, lots] = await Promise.all([
        prisma.produit.count({ where }).catch(() => 0),
        prisma.produit.aggregate({ where, _sum: { prix_achat: true } }).catch(() => ({ _sum: { prix_achat: 0 } })),
        prisma.reparation.aggregate({ where: { produit: where }, _sum: { cout: true } }).catch(() => ({ _sum: { cout: 0 } })),
        prisma.produit.findMany({
          where,
          orderBy,
          skip: (page - 1) * PAR_PAGE,
          take: PAR_PAGE,
          select: {
            id: true, code_interne: true, reference: true, categorie: true, categorie_id: true,
            categorie_rel: { select: { nom: true, parent: { select: { nom: true, parent: { select: { nom: true } } } } } },
            modele_id: true,
            modele: { select: { id: true, nom: true, image_url: true } },
            statut: true, a_jeter: true, en_vitrine: true, prix_achat: true,
            prix_vente_fixe: true, prix_vente_reel: true, created_at: true,
            numero_serie: true, grade: true, emplacement: true,
            etiquette_imprimee: true, poste_reseaux: true, lot: { select: { id: true, fournisseur: true, date_entree: true } },
            reparations: { select: { cout: true } }, _count: { select: { images: true, composants: true } },
            est_compose: true, parent_id: true,
          },
        }),
        prisma.categorie.findMany({ where: { parent_id: null }, select: { nom: true } }).catch(() => []),
        prisma.lot.findMany({ orderBy: { id: "desc" }, select: { id: true, fournisseur: true, date_entree: true } }).catch(() => []),
      ]);
      totalProduits = totalCount;
      totalPages = Math.max(1, Math.ceil(totalCount / PAR_PAGE));
      sommeAchatResult = sommeAchat;
      sommeReparationsResult = sommeReparations;
      produits = fetchedProduits;
      categoriesResult = categories;
      lotsResult = lots;
    }

    // Présence d'une photo de couverture : booléen seul, aucune image transférée.
    const avecCouverture = await couverturesProduits(produits.map((p) => p.id)).catch(() => new Map());

    const maintenant = Date.now();
    return NextResponse.json({
      total: totalProduits,
      pages: totalPages,
      page,
      valeur: (sommeAchatResult?._sum?.prix_achat ?? 0) + (sommeReparationsResult?._sum?.cout ?? 0),
      categories: (categoriesResult || []).map((c) => c.nom).filter(Boolean).sort(),
      lots: (lotsResult || []).map((l) => ({
        id: l.id,
        libelle: `n°${l.id} — ${l.fournisseur || "Fournisseur"} (${l.date_entree ? new Date(l.date_entree).toLocaleDateString("fr-FR") : "-"})`,
      })),
      produits: (produits || []).map((p) => {
        const dateRef = p.lot?.date_entree ? new Date(p.lot.date_entree) : (p.created_at ? new Date(p.created_at) : new Date());
        return {
          id: p.id,
          code_interne: p.code_interne,
          reference: p.reference,
          categorie: p.categorie,
          categorie_id: p.categorie_id,
          categorie_rel: p.categorie_rel,
          modele_id: p.modele_id,
          modele: p.modele,
          statut: p.statut,
          a_jeter: p.a_jeter,
          en_vitrine: p.en_vitrine,
          numero_serie: p.numero_serie ?? null,
          grade: p.grade ?? null,
          emplacement: p.emplacement ?? null,
          prix_achat: p.prix_achat ?? 0,
          image_url: urlCouverture(avecCouverture.get(p.id), p.id),
          nb_images: (avecCouverture.has(p.id) ? 1 : 0) + (p._count?.images ?? 0),
          nb_composants: p._count?.composants ?? 0,
          est_compose: p.est_compose ?? false,
          parent_id: p.parent_id ?? null,
          cout_reparations: (p.reparations || []).reduce((s: number, r: { cout: number }) => s + (r.cout || 0), 0),
          prix_vente_fixe: p.prix_vente_fixe,
          prix_vente_reel: p.prix_vente_reel,
          etiquette_imprimee: p.etiquette_imprimee,
          poste_reseaux: p.poste_reseaux,
          lot_id: p.lot?.id ?? null,
          fournisseur: p.lot?.fournisseur ?? null,
          // Sans lot, la date d'entrée est celle de création du produit.
          date_entree: dateRef.toISOString(),
          jours_stock: Math.max(0, Math.floor((maintenant - dateRef.getTime()) / JOUR_MS)),
        };
      }),
    });
  } catch (e: any) {
    console.error("GET /api/produits error:", e?.message || e);
    return erreur(500, e?.message || "Erreur lors du chargement de l'inventaire.");
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
  const { lot_id, reference, categorie, prix_achat, prix_vente_fixe, image_url, images, quantite, en_vitrine, est_compose } =
    (corps ?? {}) as {
      lot_id?: unknown;
      reference?: unknown;
      categorie?: unknown;
      prix_achat?: unknown;
      prix_vente_fixe?: unknown;
      image_url?: unknown;
      images?: unknown;
      quantite?: unknown;
      en_vitrine?: unknown;
      est_compose?: unknown;
    };

  const lotId = lot_id ? Number(lot_id) : null;
  if (lot_id && !Number.isInteger(lotId)) return erreur(400, "Lot invalide.");
  const validation = validerLignesProduits([{ reference, categorie, prix_achat, prix_vente_fixe, image_url, images, est_compose }]);
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
    // Les photos sont téléversées AVANT la transaction : la base ne stocke que
    // leur URL (une seule fois, partagée par les `qty` exemplaires).
    const lignes = await televerserLignes(Array.from({ length: qty }, () => ligne));
    const codes = await prisma.$transaction(
      async (tx) => {
        const c = await creerProduitsGroupes(tx, {
          lotId: lotId,
          lignes,
          userId: user.id,
          enVitrine: en_vitrine === true,
        });
        if (ligne.modele_id) {
          await StockService.synchroniserCompteModele(ligne.modele_id, tx);
        }
        return c;
      },
      { timeout: 120000 }
    );

    // Audit Log
    await enregistrerActivite(prisma, user.id, ACTIONS_JOURNAL.PRODUIT_AJOUTER, "lot", lotId ?? undefined, {
      quantite: qty,
      categorie: ligne.categorie,
      codes: codes,
    });

    return NextResponse.json(
      { ok: true, ajoutes: qty, code_interne: codes[0] },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/produits", e);
    return erreur(500, "Erreur lors de l'ajout du produit.");
  }
}
