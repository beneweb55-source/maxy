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
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
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
