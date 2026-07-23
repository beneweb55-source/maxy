import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { lireDataUrlImage } from "@/lib/images";

// Sert une photo supplémentaire (galerie) d'un produit, décodée depuis sa
// donnée data-URL stockée en base.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id, imageId } = await params;
  const produitId = Number(id);
  const imgId = Number(imageId);
  if (!Number.isInteger(produitId) || !Number.isInteger(imgId)) {
    return erreur(400, "Identifiant invalide.");
  }

  try {
    const image = await prisma.produitImage.findUnique({
      where: { id: imgId },
      select: { data: true, produit_id: true },
    });
    if (!image || image.produit_id !== produitId) {
      return erreur(404, "Photo introuvable.");
    }

    const photo = lireDataUrlImage(image.data);
    if (!photo) return erreur(404, "Photo illisible.");

    const octets = Buffer.from(photo.base64, "base64");
    return new NextResponse(new Uint8Array(octets), {
      headers: {
        "Content-Type": photo.mime,
        "Content-Length": String(octets.byteLength),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/images/[imageId]", e);
    return erreur(500, "Erreur lors du chargement de la photo.");
  }
}
