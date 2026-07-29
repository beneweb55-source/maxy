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
    const clauses: Prisma.FactureWhereInput[] = [];

    const q = params.get("q")?.trim();
    if (q) {
      clauses.push({
        OR: [
          { numero: { contains: q, mode: "insensitive" } },
          { client_nom: { contains: q, mode: "insensitive" } },
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
          createur: { select: { username: true } },
          _count: { select: { lignes: true } },
        },
      }),
    ]);

    return NextResponse.json({
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
      factures: factures.map((f) => ({
        id: f.id,
        numero: f.numero,
        date_emission: f.date_emission.toISOString(),
        client_nom: f.client_nom,
        total: f.total,
        garantie_fin: f.garantie_fin.toISOString(),
        annulee: f.annulee,
        canal: f.canal,
        vendeur: f.createur.username,
        nb_lignes: f._count.lignes,
      })),
    });
  } catch (e) {
    console.error("GET /api/factures", e);
    return erreur(500, "Erreur lors du chargement des factures.");
  }
}
