import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

const PAR_PAGE = 50;

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;

    // Récupération par IDs pour impression en masse
    const idsParam = params.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length > 0) {
        const [facturesCompletes, parametres] = await Promise.all([
          prisma.facture.findMany({
            where: { id: { in: ids } },
            orderBy: { id: "asc" },
            select: {
              id: true,
              numero: true,
              date_emission: true,
              client_nom: true,
              client_tel: true,
              total: true,
              garantie_mois: true,
              garantie_fin: true,
              canal: true,
              type_document: true,
              client_adresse: true,
              client_rc: true,
              client_nif: true,
              client_ai: true,
              client_nis: true,
              mode_paiement: true,
              annulee: true,
              createur: { select: { username: true } },
              lignes: {
                orderBy: { id: "asc" },
                select: {
                  id: true,
                  produit_id: true,
                  vente_id: true,
                  code_interne: true,
                  designation: true,
                  categorie: true,
                  prix: true,
                  garantie_fin: true,
                },
              },
            },
          }),
          prisma.parametres.findUnique({ where: { id: 1 } }),
        ]);

        return NextResponse.json({
          factures: facturesCompletes.map((f) => ({
            ...f,
            date_emission: f.date_emission.toISOString(),
            garantie_fin: f.garantie_fin.toISOString(),
            total_net: f.total,
            vendeur: f.createur.username,
            type_facture: f.type_document, // Alias legacy pour compatibilité PDF
            entreprise: {
              nom: parametres?.entreprise_nom ?? "Solution Maxi",
              adresse: parametres?.entreprise_adresse ?? "Alger, Algérie",
              tel: parametres?.entreprise_tel ?? "0000 00 00 00",
              rc: parametres?.entreprise_rc ?? "RC XXXXXXXXX",
              nif: parametres?.entreprise_nif ?? "NIF XXXXXXXXX",
              nis: parametres?.entreprise_nis ?? "NIS XXXXXXXXX",
              art: parametres?.entreprise_art ?? "ART XXXXXXXXX",
              rib: parametres?.entreprise_rib ?? null,
              cachet: parametres?.entreprise_cachet ?? null,
            },
          })),
        });
      }
    }

    const clauses: Prisma.FactureWhereInput[] = [];

    const q = params.get("q")?.trim();
    if (q) {
      clauses.push({
        OR: [
          { numero: { contains: q, mode: "insensitive" } },
          { client_nom: { contains: q, mode: "insensitive" } },
          { client_tel: { contains: q, mode: "insensitive" } },
          { lignes: { some: { designation: { contains: q, mode: "insensitive" } } } },
          { lignes: { some: { code_interne: { contains: q, mode: "insensitive" } } } },
        ],
      });
    }

    const mois = params.get("mois");
    if (mois && /^\d{4}-\d{2}$/.test(mois)) {
      const [a, m] = mois.split("-").map(Number);
      if (a && m) {
        clauses.push({
          date_emission: {
            gte: new Date(Date.UTC(a, m - 1, 1)),
            lt: new Date(Date.UTC(a, m, 1)),
          },
        });
      }
    }

    // Filtre par type de document : ?type=DEVIS ou ?type=FACTURE_TVA,PROFORMA
    const typeParam = params.get("type");
    if (typeParam) {
      const typesValides = ["FACTURE_TVA", "PROFORMA", "DEVIS"] as const;
      type TypeDoc = typeof typesValides[number];
      const typesFiltres = typeParam
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter((t): t is TypeDoc => (typesValides as readonly string[]).includes(t));
      if (typesFiltres.length > 0) {
        clauses.push({ type_document: { in: typesFiltres } });
      }
    }

    const where: Prisma.FactureWhereInput = clauses.length > 0 ? { AND: clauses } : {};
    const page = Math.max(1, Number(params.get("page")) || 1);

    const [total, factures] = await Promise.all([
      prisma.facture.count({ where }),
      prisma.facture.findMany({
        where,
        orderBy: { date_emission: "desc" },
        skip: (page - 1) * PAR_PAGE,
        take: PAR_PAGE,
        select: {
          id: true,
          numero: true,
          date_emission: true,
          client_nom: true,
          total: true,
          garantie_fin: true,
          annulee: true,
          canal: true,
          type_document: true,
          createur: { select: { username: true } },
          lignes: { select: { prix: true, vente_id: true } },
        },
      }),
    ]);

    const venteIds = new Set<number>();
    for (const f of factures) {
      for (const l of f.lignes) {
        if (l.vente_id !== null) venteIds.add(l.vente_id);
      }
    }

    const ventesAnnulees = new Set(
      (
        await prisma.vente.findMany({
          where: {
            id: { in: Array.from(venteIds) },
            annulee: true,
          },
          select: { id: true },
        })
      ).map((v) => v.id)
    );

    return NextResponse.json({
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
      factures: factures.map((f) => {
        const totalNet = f.lignes.reduce(
          (s, l) => (l.vente_id !== null && ventesAnnulees.has(l.vente_id) ? s : s + l.prix),
          0
        );
        return {
          id: f.id,
          numero: f.numero,
          date_emission: f.date_emission.toISOString(),
          client_nom: f.client_nom,
          total: f.total,
          total_net: totalNet,
          garantie_fin: f.garantie_fin.toISOString(),
          annulee: f.annulee,
          canal: f.canal,
          type_document: f.type_document,
          type_facture: f.type_document, // Alias legacy
          vendeur: f.createur.username,
          nb_lignes: f.lignes.length,
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/factures", e);
    return erreur(500, "Erreur lors du chargement des factures.");
  }
}
