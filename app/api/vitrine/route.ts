import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { urlPhotoProduit, urlPhotoSupplementaire } from "@/lib/images";

// La vitrine raisonne par MODÈLE : mettre « le principal » en vitrine suffit à
// représenter tout le lot d'exemplaires identiques. Une seule carte par
// référence exposée, avec la quantité en stock — pas une carte par unité.
export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const exposes = await prisma.produit.findMany({
      where: { en_vitrine: true },
      orderBy: { id: "asc" },
      include: { images: { orderBy: { position: "asc" }, select: { id: true } } },
    });

    // Regroupe les unités exposées par modèle (référence + catégorie),
    // comme le regroupement de l'inventaire.
    const groupes = new Map<string, typeof exposes>();
    for (const p of exposes) {
      const cle = `${p.reference.trim().toLowerCase()}|${p.categorie.trim().toLowerCase()}`;
      const existant = groupes.get(cle);
      if (existant) existant.push(p);
      else groupes.set(cle, [p]);
    }

    const cartes = await Promise.all(
      Array.from(groupes.values()).map(async (unites) => {
        // Représentant : la première unité avec photo, sinon la première.
        const rep = unites.find((u) => u.image_url) ?? unites[0]!;
        // Quantité affichée : TOUS les exemplaires identiques encore en stock
        // (non vendus), exposés ou non.
        const quantite = await prisma.produit.count({
          where: {
            reference: { equals: rep.reference.trim(), mode: "insensitive" },
            categorie: { equals: rep.categorie.trim(), mode: "insensitive" },
            statut: { not: "vendu" },
          },
        });
        return {
          id: rep.id,
          code_interne: rep.code_interne,
          reference: rep.reference,
          categorie: rep.categorie,
          statut: rep.statut,
          prix_vente_fixe: rep.prix_vente_fixe,
          prix_vente_reel: rep.prix_vente_reel,
          image_url: rep.image_url ? urlPhotoProduit(rep.id) : null,
          images: [
            ...(rep.image_url ? [urlPhotoProduit(rep.id)] : []),
            ...rep.images.map((img) => urlPhotoSupplementaire(rep.id, img.id)),
          ],
          quantite,
          // Toutes les unités marquées « en vitrine » du modèle : permet de
          // retirer le modèle entier de la vitrine en une seule action.
          ids_en_vitrine: unites.map((u) => u.id),
        };
      })
    );

    cartes.sort((a, b) => a.reference.localeCompare(b.reference, "fr"));
    return NextResponse.json({ total: cartes.length, produits: cartes });
  } catch (e) {
    console.error("GET /api/vitrine", e);
    return erreur(500, "Erreur lors du chargement de la vitrine.");
  }
}
