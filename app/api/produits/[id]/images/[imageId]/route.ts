import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { extensionDepuisMime, lireDataUrlImage } from "@/lib/images";
import { nomSur } from "@/lib/zip";

// Sert une photo supplémentaire (galerie) d'un produit, décodée depuis sa
// donnée data-URL stockée en base.
export async function GET(
  request: NextRequest,
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
      select: {
        data: true,
        produit_id: true,
        position: true,
        produit: { select: { code_interne: true } },
      },
    });
    if (!image || image.produit_id !== produitId) {
      return erreur(404, "Photo introuvable.");
    }

    const photo = lireDataUrlImage(image.data);
    if (!photo) return erreur(404, "Photo illisible.");

    const octets = Buffer.from(photo.base64, "base64");
    const entetes: Record<string, string> = {
      "Content-Type": photo.mime,
      "Content-Length": String(octets.byteLength),
      // Cache long : une photo de galerie est immuable pour un id donné.
      "Cache-Control": "private, max-age=604800, immutable",
      ETag: `"${imgId}-${octets.byteLength}"`,
    };
    // `?download=1` : téléchargement direct, numéroté comme dans le ZIP
    // (couverture = 01, galerie = position + 1).
    if (request.nextUrl.searchParams.get("download") === "1") {
      const numero = String(image.position + 1).padStart(2, "0");
      const nom = `${nomSur(image.produit.code_interne)}-${numero}.${extensionDepuisMime(photo.mime)}`;
      entetes["Content-Disposition"] = `attachment; filename="${nom}"`;
    }
    return new NextResponse(new Uint8Array(octets), { headers: entetes });
  } catch (e) {
    console.error("GET /api/produits/[id]/images/[imageId]", e);
    return erreur(500, "Erreur lors du chargement de la photo.");
  }
}
