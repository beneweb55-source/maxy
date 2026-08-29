import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";
import { televerserPhoto } from "@/lib/stockage-images";
import { validerPhoto } from "@/lib/images";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ nom: string }> }
) {
  try {
    const { user, reponse } = await exigerUtilisateur(["gerant", "dev"]);
    if (reponse) return reponse;

    const { nom } = await params;
    
    // Le nom décodé est la clé de la catégorie (ex: "laptop")
    const nomDecode = decodeURIComponent(nom);
    const donnees = await request.json();
    
    let imageUrlToSave = donnees.image_url;

    // Si on a une data-URL, on la téléverse vers le Blob Storage
    if (imageUrlToSave && imageUrlToSave.startsWith("data:")) {
      const erreurValidation = validerPhoto(imageUrlToSave);
      if (erreurValidation) {
        return NextResponse.json({ error: erreurValidation }, { status: 400 });
      }
      
      const uploadedUrl = await televerserPhoto(imageUrlToSave, "categories");
      if (uploadedUrl) {
        imageUrlToSave = uploadedUrl;
      }
    }

    // Upsert the CategorieInfo
    const result = await prisma.categorieInfo.upsert({
      where: { nom: nomDecode },
      update: {
        ...(imageUrlToSave !== undefined && { image_url: imageUrlToSave }),
        ...(donnees.description !== undefined && { description: donnees.description })
      },
      create: {
        nom: nomDecode,
        image_url: imageUrlToSave || null,
        description: donnees.description || null
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erreur PATCH /api/categories/[nom]:", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
