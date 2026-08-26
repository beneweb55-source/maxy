import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { nom: string } }) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  
  if (acces.user.role !== "admin" && acces.user.role !== "manager") {
    return erreur(403, "Seul un administrateur ou manager peut modifier l'image d'une catégorie.");
  }

  const nom = decodeURIComponent(params.nom);

  try {
    const data = await req.json();
    const { image_url } = data;

    const categorieInfo = await prisma.categorieInfo.upsert({
      where: { nom },
      update: { image_url },
      create: { nom, image_url },
    });

    return NextResponse.json(categorieInfo);
  } catch (e) {
    console.error("PATCH /api/categories/[nom]", e);
    return erreur(500, "Erreur lors de la modification de la catégorie.");
  }
}
