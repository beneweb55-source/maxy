import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const acces = await exigerUtilisateur();
    if (acces.reponse) return acces.reponse;

    const { searchParams } = new URL(request.url);
    const categorie_id = searchParams.get("categorie_id");
    const q = searchParams.get("q")?.trim();

    const where: any = {};
    if (categorie_id) {
      where.categorie_id = Number(categorie_id);
    }
    if (q) {
      where.nom = { contains: q, mode: "insensitive" };
    }

    const modeles = await prisma.modele.findMany({
      where,
      include: {
        categorie: {
          select: { id: true, nom: true, parent_id: true },
        },
        _count: {
          select: { exemplaires: true },
        },
      },
      orderBy: {
        nom: 'asc'
      },
      take: 100,
    });

    return NextResponse.json(modeles);
  } catch (error) {
    console.error("Erreur GET /api/modeles:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des modèles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const acces = await exigerUtilisateur();
    if (acces.reponse) return acces.reponse;

    const body = await request.json();
    const { nom, categorie_id, attributs } = body;

    if (!nom || nom.trim() === "") {
      return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
    }

    if (!categorie_id) {
      return NextResponse.json({ error: "categorie_id est obligatoire" }, { status: 400 });
    }

    // Vérifier que la catégorie existe
    const categorie = await prisma.categorie.findUnique({
      where: { id: Number(categorie_id) }
    });

    if (!categorie) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    }

    // Vérifier si le modèle existe déjà
    const modeleExistant = await prisma.modele.findFirst({
      where: {
        nom: nom.trim(),
        categorie_id: Number(categorie_id)
      }
    });

    if (modeleExistant) {
      return NextResponse.json({ error: "Ce modèle existe déjà dans cette catégorie" }, { status: 400 });
    }

    const modele = await prisma.modele.create({
      data: {
        nom: nom.trim(),
        categorie_id: Number(categorie_id),
        attributs: attributs || {},
      }
    });

    return NextResponse.json(modele);
  } catch (error) {
    console.error("Erreur POST /api/modeles:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du modèle" },
      { status: 500 }
    );
  }
}
