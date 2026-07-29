import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { extensionDepuisMime } from "@/lib/images";
import { lireOctetsPhoto } from "@/lib/stockage-images";
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
        en_vitrine: true,
        images: { orderBy: { position: "asc" }, select: { data: true } },
      },
    });
    if (!produit) return erreur(404, "Produit introuvable.");

    // Le rôle social_media est limité aux produits en vente, vendus ou en vitrine.
    if (
      acces.user.role === "social_media" &&
      produit.statut !== "en_vente" &&
      produit.statut !== "vendu" &&
      !produit.en_vitrine
    ) {
      return erreur(403, "Accès restreint à ce produit.");
    }

    const sources = [
      ...(produit.image_url ? [produit.image_url] : []),
      ...produit.images.map((img) => img.data),
    ];
    // Les photos peuvent être stockées en base (base64) ou hébergées sur le
    // stockage objet : `lireOctetsPhoto` gère les deux cas.
    const entrees: { chemin: string; contenu: Buffer }[] = [];
    for (const source of sources) {
      const photo = await lireOctetsPhoto(source);
      if (!photo) continue;
      entrees.push({
        chemin: `${String(entrees.length + 1).padStart(2, "0")}.${extensionDepuisMime(photo.mime)}`,
        contenu: photo.octets,
      });
    }

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
