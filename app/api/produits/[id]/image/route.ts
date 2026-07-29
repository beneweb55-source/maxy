import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { estUrlPhotoDistante, extensionDepuisMime, lireDataUrlImage } from "@/lib/images";
import { nomSur } from "@/lib/zip";

export async function GET(
  request: NextRequest,
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
      select: { image_url: true, code_interne: true },
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
    const entetes: Record<string, string> = {
      "Content-Type": photo.mime,
      "Content-Length": String(octets.byteLength),
      // Cache long : les photos pèsent lourd et transitent depuis la base.
      // Un changement de photo change le contenu, l'ETag ci-dessous permet au
      // navigateur de revalider sans retélécharger.
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
      ETag: `"${produitId}-${octets.byteLength}"`,
    };
    // `?download=1` : téléchargement direct avec un nom de fichier propre
    // (la couverture est toujours la photo n°01).
    if (request.nextUrl.searchParams.get("download") === "1") {
      const nom = `${nomSur(produit.code_interne)}-01.${extensionDepuisMime(photo.mime)}`;
      entetes["Content-Disposition"] = `attachment; filename="${nom}"`;
    }
    return new NextResponse(new Uint8Array(octets), { headers: entetes });
  } catch (e) {
    console.error("GET /api/produits/[id]/image", e);
    return erreur(500, "Erreur lors du chargement de la photo.");
  }
}
