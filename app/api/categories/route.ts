import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parentIdParam = searchParams.get("parent_id");
    const fullTree = searchParams.get("tree") === "1" || !parentIdParam;

    if (!fullTree && parentIdParam) {
      const categories = await prisma.categorie.findMany({
        where: {
          parent_id: parentIdParam === "null" ? null : Number(parentIdParam),
        },
        include: {
          _count: {
            select: { modeles: true, produits: true, enfants: true },
          },
        },
        orderBy: {
          ordre: "asc",
        },
      });
      return NextResponse.json(categories);
    }

    const categories = await prisma.categorie.findMany({
      where: {
        parent_id: null,
      },
      include: {
        enfants: {
          include: {
            enfants: {
              include: {
                _count: {
                  select: { modeles: true, produits: true },
                },
              },
              orderBy: { ordre: "asc" },
            },
            _count: {
              select: { modeles: true, produits: true, enfants: true },
            },
          },
          orderBy: { ordre: "asc" },
        },
        _count: {
          select: { modeles: true, produits: true, enfants: true },
        },
      },
      orderBy: {
        ordre: "asc",
      },
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
