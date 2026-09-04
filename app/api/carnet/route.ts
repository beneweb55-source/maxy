import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const url = new URL(request.url);
  const search = url.searchParams.get("q") || "";
  const auteur = url.searchParams.get("auteur") || "";
  const categorie = url.searchParams.get("categorie") || "";
  const periode = url.searchParams.get("periode") || ""; // "aujourdhui", "semaine", "mois"

  // SEC-02/03 : les techniciens ne voient que leurs propres entrées
  const conditions: Prisma.CarnetEntreeWhereInput = {};
  if (!["gerant", "dev"].includes(user.role)) {
    conditions.user_id = user.id;
  }

  if (search.trim()) {
    conditions.OR = [
      { titre: { contains: search, mode: "insensitive" } },
      { contenu: { contains: search, mode: "insensitive" } },
    ];
  }

  if (auteur && !isNaN(Number(auteur))) {
    conditions.user_id = Number(auteur);
  }

  if (categorie) {
    conditions.categories = { has: categorie as any };
  }

  if (periode) {
    const now = new Date();
    if (periode === "aujourdhui") {
      const debut = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      conditions.date_travail = { gte: debut };
    } else if (periode === "semaine") {
      const debut = new Date(now);
      debut.setDate(debut.getDate() - 7);
      conditions.date_travail = { gte: debut };
    } else if (periode === "mois") {
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      conditions.date_travail = { gte: debut };
    }
  }

  try {
    const entrees = await prisma.carnetEntree.findMany({
      where: conditions,
      orderBy: { date_travail: "desc" },
      include: {
        user: { select: { id: true, username: true, role: true } },
        _count: { select: { pieces_jointes: true } }
      },
    });
    return NextResponse.json(entrees);
  } catch (e) {
    console.error("GET /api/carnet", e);
    return erreur(500, "Erreur lors du chargement du carnet.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: any;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const { titre, categories, date_travail, contenu } = corps;

  if (!titre || !categories || !Array.isArray(categories) || categories.length === 0 || !date_travail) {
    return erreur(400, "Titre, catégories (array) et date sont obligatoires.");
  }

  try {
    const entree = await prisma.carnetEntree.create({
      data: {
        user_id: user.id,
        titre: titre.trim(),
        categories: categories as any,
        date_travail: new Date(date_travail),
        contenu: contenu || "",
      },
    });
    return NextResponse.json(entree, { status: 201 });
  } catch (e) {
    console.error("POST /api/carnet", e);
    return erreur(500, "Erreur lors de la création de l'entrée.");
  }
}
