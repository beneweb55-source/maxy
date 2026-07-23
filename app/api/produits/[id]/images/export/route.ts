import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { extensionDepuisMime, lireDataUrlImage } from "@/lib/images";
import { creerZip, nomSur } from "@/lib/zip";

// Télécharge toutes les photos d'un produit dans une archive ZIP nommée et
// numérotée (01.jpg, 02.jpg, …).
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
      select: {
        code_interne: true,
        reference: true,
        image_url: true,
        statut: true,
        images: { orderBy: { position: "asc" }, select: { data: true } },
      },
    });
    if (!produit) return erreur(404, "Produit introuvable.");

    // Le rôle social_media est limité aux produits en vente / vendus.
    if (
      acces.user.role === "social_media" &&
      produit.statut !== "en_vente" &&
      produit.statut !== "vendu"
    ) {
      return erreur(403, "Accès restreint à ce produit.");
    }

    const sources = [
      ...(produit.image_url ? [produit.image_url] : []),
      ...produit.images.map((img) => img.data),
    ];
    const entrees = sources
      .map((data) => lireDataUrlImage(data))
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((photo, i) => ({
        chemin: `${String(i + 1).padStart(2, "0")}.${extensionDepuisMime(photo.mime)}`,
        contenu: Buffer.from(photo.base64, "base64"),
      }));

    if (entrees.length === 0) return erreur(404, "Ce produit n'a aucune photo.");

    const zip = creerZip(entrees);
    const nomFichier = nomSur(`${produit.code_interne} ${produit.reference}`);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${nomFichier}.zip"`,
        "Content-Length": String(zip.byteLength),
      },
    });
  } catch (e) {
    console.error("GET /api/produits/[id]/images/export", e);
    return erreur(500, "Erreur lors de la préparation des photos.");
  }
}
