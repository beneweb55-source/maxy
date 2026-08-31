import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import type { StatutCommande, TypePaiement } from "@prisma/client";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;

  try {
    const { searchParams } = request.nextUrl;
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length > 0) {
        const [commandes, parametres] = await Promise.all([
          prisma.commande.findMany({
            where: { id: { in: ids } },
            orderBy: { id: "asc" },
            include: {
              client: true,
              vendeur: { select: { id: true, username: true, role: true } },
              lignes: true,
            },
          }),
          prisma.parametres.findUnique({ where: { id: 1 } }),
        ]);

        return NextResponse.json({
          commandes,
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
        });
      }
    }

    const statut = searchParams.get("statut");
    const q = searchParams.get("q")?.trim();
    const periode = searchParams.get("periode"); // "aujourdhui", "semaine", "mois"
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (statut && statut !== "tous") {
      where.statut = statut as StatutCommande;
    }

    if (q) {
      where.OR = [
        { numero: { contains: q, mode: "insensitive" } },
        { client_nom: { contains: q, mode: "insensitive" } },
        { client_tel: { contains: q, mode: "insensitive" } },
        { client: { nom: { contains: q, mode: "insensitive" } } },
        { lignes: { some: { designation: { contains: q, mode: "insensitive" } } } },
        { lignes: { some: { numero_serie: { contains: q, mode: "insensitive" } } } },
      ];
    }

    if (periode) {
      const maintenant = new Date();
      if (periode === "aujourdhui") {
        const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), 0, 0, 0);
        where.date_commande = { gte: debut };
      } else if (periode === "semaine") {
        const debut = new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
        where.date_commande = { gte: debut };
      } else if (periode === "mois") {
        const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1, 0, 0, 0);
        where.date_commande = { gte: debut };
      }
    }

    const [total, commandes] = await Promise.all([
      prisma.commande.count({ where }),
      prisma.commande.findMany({
        where,
        orderBy: { date_commande: "desc" },
        skip,
        take: limit,
        include: {
          client: true,
          vendeur: { select: { id: true, username: true, role: true } },
          lignes: true,
        },
      }),
    ]);

    return NextResponse.json({
      commandes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (e: any) {
    console.error("GET /api/commandes:", e);
    return erreur(500, e.message || "Erreur lors du chargement des commandes.");
  }
}

import { createOrder } from "@/lib/commandes";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const body = await request.json();
    const commandeCreee = await createOrder(body, user.id);
    return NextResponse.json(commandeCreee, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/commandes:", e);
    return erreur(500, e.message || "Erreur lors de la création de la commande.");
  }
}
