import { type NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { construireFiltresProduits, construireTriProduits } from "@/lib/filtres-produits";
import { extensionDepuisMime, lireDataUrlImage } from "@/lib/images";
import { creerZip, nomSur } from "@/lib/zip";

// Garde-fous pour éviter une archive démesurée (mémoire / taille de réponse).
const MAX_PRODUITS = 200;
const MAX_OCTETS = 60 * 1024 * 1024; // ~60 Mo de photos

// Télécharge, dans une seule archive ZIP, les photos de tous les produits
// correspondant aux filtres courants, organisées en un dossier par produit :
//   « P-0001 Dell Latitude / 01.jpg, 02.jpg … ».
export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    let where = construireFiltresProduits(params);
    // Le rôle social_media est restreint aux produits en vente / vendus.
    if (acces.user.role === "social_media") {
      where = { AND: [where, { statut: { in: ["en_vente", "vendu"] } }] } as Prisma.ProduitWhereInput;
    }
    // Seuls les produits ayant au moins une photo (couverture ou galerie).
    where = {
      AND: [where, { OR: [{ image_url: { not: null } }, { images: { some: {} } }] }],
    } as Prisma.ProduitWhereInput;

    const produits = await prisma.produit.findMany({
      where,
      orderBy: construireTriProduits(params),
      take: MAX_PRODUITS + 1,
      select: {
        code_interne: true,
        reference: true,
        image_url: true,
        images: { orderBy: { position: "asc" }, select: { data: true } },
      },
    });

    const tropNombreux = produits.length > MAX_PRODUITS;
    const retenus = produits.slice(0, MAX_PRODUITS);

    const entrees: { chemin: string; contenu: Buffer }[] = [];
    const dossiersUtilises = new Map<string, number>();
    let total = 0;
    let tronqueTaille = false;

    for (const p of retenus) {
      const sources = [
        ...(p.image_url ? [p.image_url] : []),
        ...p.images.map((img) => img.data),
      ];

      // Nom de dossier unique et lisible par produit.
      let dossier = nomSur(`${p.code_interne} ${p.reference}`);
      const vus = dossiersUtilises.get(dossier) ?? 0;
      dossiersUtilises.set(dossier, vus + 1);
      if (vus > 0) dossier = `${dossier} (${vus + 1})`;

      let n = 0;
      for (const data of sources) {
        const photo = lireDataUrlImage(data);
        if (!photo) continue;
        const contenu = Buffer.from(photo.base64, "base64");
        if (total + contenu.byteLength > MAX_OCTETS) {
          tronqueTaille = true;
          break;
        }
        total += contenu.byteLength;
        n += 1;
        entrees.push({
          chemin: `${dossier}/${String(n).padStart(2, "0")}.${extensionDepuisMime(photo.mime)}`,
          contenu,
        });
      }
      if (tronqueTaille) break;
    }

    if (entrees.length === 0) {
      return erreur(404, "Aucun produit filtré ne possède de photo.");
    }

    // Note d'information si l'archive a été tronquée (trop de produits ou de poids).
    if (tropNombreux || tronqueTaille) {
      const raison = tropNombreux
        ? `Plus de ${MAX_PRODUITS} produits correspondent au filtre : seuls les ${MAX_PRODUITS} premiers sont inclus.`
        : `L'archive a atteint la taille maximale (~60 Mo) : certaines photos ont été omises.`;
      entrees.push({
        chemin: `_LISEZ-MOI.txt`,
        contenu: Buffer.from(
          `Export partiel des photos.\n${raison}\nAffinez les filtres de l'inventaire pour un export complet.\n`,
          "utf8"
        ),
      });
    }

    const zip = creerZip(entrees);
    const horodatage = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="photos-inventaire-${horodatage}.zip"`,
        "Content-Length": String(zip.byteLength),
      },
    });
  } catch (e) {
    console.error("GET /api/produits/images/export", e);
    return erreur(500, "Erreur lors de la préparation des photos.");
  }
}
