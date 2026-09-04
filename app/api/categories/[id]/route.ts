import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const categorie = await prisma.categorie.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, nom: true, parent_id: true },
        },
        enfants: {
          include: {
            enfants: {
              include: {
                _count: { select: { modeles: true, produits: true } },
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
    });

    if (!categorie) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    }

    return NextResponse.json(categorie);
  } catch (error) {
    console.error("Erreur GET /api/categories/[id]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la catégorie" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const { nom, parent_id, description, image_url, attributs_schema } = body;

    // Éviter les boucles infinies (une catégorie ne peut pas être son propre parent)
    if (parent_id === id) {
      return NextResponse.json(
        { error: "Une catégorie ne peut pas être son propre parent" },
        { status: 400 }
      );
    }

    const categorie = await prisma.categorie.update({
      where: { id },
      data: {
        ...(nom !== undefined && { nom: nom.trim() }),
        ...(parent_id !== undefined && { parent_id: parent_id ? Number(parent_id) : null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(image_url !== undefined && { image_url: image_url?.trim() || null }),
        ...(attributs_schema !== undefined && { attributs_schema })
      }
    });

    return NextResponse.json(categorie);
  } catch (error) {
    console.error("Erreur PUT /api/categories/[id]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de la catégorie" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Vérifier s'il y a des enfants, modèles ou produits attachés
    const cat = await prisma.categorie.findUnique({
      where: { id },
      include: {
        _count: {
          select: { enfants: true, modeles: true, produits: true }
        }
      }
    });

    if (!cat) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    }

    if (cat._count.enfants > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer une catégorie contenant des sous-catégories" },
        { status: 400 }
      );
    }

    if (cat._count.modeles > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer une catégorie contenant des modèles" },
        { status: 400 }
      );
    }

    if (cat._count.produits > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : cette catégorie contient encore ${cat._count.produits} produit(s). Reclassifiez-les d'abord.` },
        { status: 400 }
      );
    }

    await prisma.categorie.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE /api/categories/[id]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la catégorie" },
      { status: 500 }
    );
  }
}
