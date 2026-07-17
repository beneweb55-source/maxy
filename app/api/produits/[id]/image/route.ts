import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { estUrlPhotoDistante, lireDataUrlImage } from "@/lib/images";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  try {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      select: { image_url: true },
    });
    if (!produit) return erreur(404, "Produit introuvable.");
    if (!produit.image_url) return erreur(404, "Ce produit n'a pas de photo.");

    const photo = lireDataUrlImage(produit.image_url);
    if (!photo) {
      if (estUrlPhotoDistante(produit.image_url)) {
        return NextResponse.redirect(produit.image_url);
      }
      return erreur(404, "Ce produit n'a pas de photo.");
    }

    const octets = Buffer.from(photo.base64, "base64");
    return new NextResponse(new Uint8Array(octets), {
      headers: {
        "Content-Type": photo.mime,
        "Content-Length": String(octets.byteLength),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/image", e);
    return erreur(500, "Erreur lors du chargement de la photo.");
  }
}
