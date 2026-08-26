import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { validerPhoto } from "@/lib/images";
import { televerserPhotos } from "@/lib/stockage-images";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const acces = await exigerUtilisateur();
    if (acces.reponse) return acces.reponse;

    const id = decodeURIComponent((await params).id);

    const famille = await prisma.familleInfo.findUnique({
      where: { id }
    });

    return NextResponse.json(famille || { id, nom: null, image_url: null, description: null });
  } catch (error) {
    console.error("Erreur GET /api/familles/[id]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const acces = await exigerUtilisateur();
    if (acces.reponse) return acces.reponse;
    
    // Only users with write permission on products (not social_media)
    if (acces.user.role === "social_media") {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 });
    }

    const id = decodeURIComponent((await params).id);
    const body = await req.json();

    const { nom, description } = body;
    let { image_url } = body;

    if (image_url) {
      if (typeof image_url === "string" && image_url.trim()) {
        const soucisPhoto = validerPhoto(image_url.trim());
        if (soucisPhoto) return erreur(400, soucisPhoto);
        image_url = (await televerserPhotos([image_url.trim()]))[0] ?? null;
      } else {
        image_url = null;
      }
    }

    const famille = await prisma.familleInfo.upsert({
      where: { id },
      update: {
        nom: nom || null,
        image_url: image_url || null,
        description: description || null
      },
      create: {
        id,
        nom: nom || null,
        image_url: image_url || null,
        description: description || null
      }
    });

    return NextResponse.json(famille);
  } catch (error) {
    console.error("Erreur PUT /api/familles/[id]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
