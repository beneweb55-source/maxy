import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const categories = await prisma.categorie.findMany({
      include: {
        enfants: {
          include: {
            enfants: true // Profondeur de 3 niveaux supportée
          }
        },
        _count: {
          select: { modeles: true }
        }
      },
      where: {
        parent_id: null
      },
      orderBy: {
        ordre: 'asc'
      }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erreur GET /api/categories:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des catégories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nom, parent_id, description, image_url, attributs_schema } = body;

    if (!nom || nom.trim() === "") {
      return NextResponse.json({ error: "Le nom est obligatoire" }, { status: 400 });
    }

    const categorie = await prisma.categorie.create({
      data: {
        nom: nom.trim(),
        parent_id: parent_id ? Number(parent_id) : null,
        description: description?.trim() || null,
        image_url: image_url?.trim() || null,
        attributs_schema: attributs_schema || null,
        ordre: 0
      }
    });

    return NextResponse.json(categorie);
  } catch (error) {
    console.error("Erreur POST /api/categories:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la catégorie" },
      { status: 500 }
    );
  }
}
