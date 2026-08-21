import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { urlPhotoProduit, urlPhotoSupplementaire } from "@/lib/images";
import { couverturesProduits, urlCouverture } from "@/lib/images-flags";

// La vitrine raisonne par MODÈLE : mettre « le principal » en vitrine suffit à
// représenter tout le lot d'exemplaires identiques. Une seule carte par
// référence exposée, avec la quantité en stock — pas une carte par unité.
export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    // `select` explicite : jamais de photo base64 dans une liste.
    const exposes = await prisma.produit.findMany({
      where: { en_vitrine: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        code_interne: true,
        reference: true,
        categorie: true,
        statut: true,
        prix_vente_fixe: true,
        prix_vente_reel: true,
        etiquette_imprimee: true,
        images: { orderBy: { position: "asc" }, select: { id: true } },
      },
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

    const avecCouverture = await couverturesProduits(exposes.map((p) => p.id));

    // Un SEUL appel pour tout le stock (champs légers, aucune image) : on
    // regroupe ensuite en mémoire. Évite 2 requêtes par modèle exposé (N+1),
    // coûteuses en transfert.
    const cle = (reference: string, categorie: string) =>
      `${reference.trim().toLowerCase()}|${categorie.trim().toLowerCase()}`;
    const stock = await prisma.produit.findMany({
      where: { statut: { not: "vendu" } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        code_interne: true,
        reference: true,
        categorie: true,
        statut: true,
        prix_vente_fixe: true,
        etiquette_imprimee: true,
      },
    });
    const stockParModele = new Map<string, typeof stock>();
    for (const p of stock) {
      const k = cle(p.reference, p.categorie);
      const liste = stockParModele.get(k);
      if (liste) liste.push(p);
      else stockParModele.set(k, [p]);
    }

    const cartes = Array.from(groupes.values()).map((unites) => {
        // Représentant : la première unité avec photo, sinon la première.
        const rep = unites.find((u) => avecCouverture.has(u.id)) ?? unites[0]!;
        const couvertureRep = urlCouverture(avecCouverture.get(rep.id), rep.id);
        const memeModele = stockParModele.get(cle(rep.reference, rep.categorie)) ?? [];
        // Quantité affichée : TOUS les exemplaires identiques encore en stock
        // (non vendus), exposés ou non.
        const quantite = memeModele.length;
        // Exemplaires réellement vendables depuis la vitrine : statut
        // « en vente » (prix fixé), les plus anciens d'abord.
        const vendables = memeModele.filter((p) => p.statut === "en_vente");
        return {
          id: rep.id,
          code_interne: rep.code_interne,
          reference: rep.reference,
          categorie: rep.categorie,
          statut: rep.statut,
          prix_vente_fixe: rep.prix_vente_fixe,
          prix_vente_reel: rep.prix_vente_reel,
          image_url: couvertureRep,
          images: [
            ...(couvertureRep ? [couvertureRep] : []),
            ...rep.images.map((img) => urlPhotoSupplementaire(rep.id, img.id)),
          ],
          quantite,
          // Toutes les unités marquées « en vitrine » du modèle : permet de
          // retirer le modèle entier de la vitrine en une seule action.
          ids_en_vitrine: unites.map((u) => u.id),
          vendables: vendables.map((v) => ({
            id: v.id,
            code_interne: v.code_interne,
            prix_vente_fixe: v.prix_vente_fixe,
            etiquette_imprimee: v.etiquette_imprimee,
          })),
        };
    });

    cartes.sort((a, b) => a.reference.localeCompare(b.reference, "fr"));
    return NextResponse.json({ total: cartes.length, produits: cartes });
  } catch (e) {
    console.error("GET /api/vitrine", e);
    return erreur(500, "Erreur lors du chargement de la vitrine.");
  }
}
