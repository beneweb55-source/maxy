import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { normaliserTexte } from "@/lib/recherche";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json({ produits: [], lots: [], factures: [] });
  }

  const terme = normaliserTexte(q);
  const LIMITE = 6;

  try {
    // Recherche en parallèle sur les 3 entités
    const [produits, lots, factures] = await Promise.all([
      prisma.produit.findMany({
        where: {
          OR: [
            { code_interne: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
            { categorie: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          code_interne: true,
          reference: true,
          categorie: true,
          statut: true,
          prix_vente_fixe: true,
          numero_serie: true,
          etiquette_imprimee: true,
        },
        take: LIMITE,
        orderBy: { created_at: "desc" },
      }),
      prisma.lot.findMany({
        where: {
          OR: [
            { fournisseur: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            ...(isFinite(Number(q)) ? [{ id: Number(q) }] : []),
          ],
        },
        select: {
          id: true,
          fournisseur: true,
          statut_lot: true,
          date_entree: true,
          _count: { select: { produits: true } },
        },
        take: LIMITE,
        orderBy: { date_entree: "desc" },
      }),
      prisma.facture.findMany({
        where: {
          OR: [
            { numero: { contains: q, mode: "insensitive" } },
            { client_nom: { contains: q, mode: "insensitive" } },
            { client_tel: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          numero: true,
          client_nom: true,
          total: true,
          date_emission: true,
          annulee: true,
        },
        take: LIMITE,
        orderBy: { date_emission: "desc" },
      }),
    ]);

    return NextResponse.json({
      produits: produits.map((p) => ({
        id: p.id,
        code_interne: p.code_interne,
        reference: p.reference,
        categorie: p.categorie,
        statut: p.statut,
        prix_vente_fixe: p.prix_vente_fixe,
        numero_serie: p.numero_serie,
        etiquette_imprimee: p.etiquette_imprimee,
        href: `/produits/${p.id}`,
      })),
      lots: lots.map((l) => ({
        id: l.id,
        fournisseur: l.fournisseur,
        statut_lot: l.statut_lot,
        date_entree: l.date_entree,
        nb_produits: l._count.produits,
        href: `/lots/${l.id}`,
      })),
      factures: factures.map((f) => ({
        id: f.id,
        numero: f.numero,
        client_nom: f.client_nom,
        total: f.total,
        date_emission: f.date_emission,
        annulee: f.annulee,
        href: `/factures/${f.id}`,
      })),
    });
  } catch (e) {
    console.error("GET /api/recherche", e);
    return erreur(500, "Erreur lors de la recherche.");
  }
}
