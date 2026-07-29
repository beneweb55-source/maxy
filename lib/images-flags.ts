import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Les photos sont stockées en base64 directement dans la colonne
// `produits.image_url` (et `produit_images.data`). Une requête Prisma avec
// `include` (ou sans `select` explicite) rapatrie donc TOUTES ces données :
// sur une liste de 50 produits, cela représente des dizaines de Mo transférés
// depuis la base à chaque affichage — de quoi épuiser le quota de transfert.
//
// Ces helpers renvoient uniquement les MÉTADONNÉES nécessaires à l'affichage
// (« ce produit a-t-il une photo ? », « combien ? ») sans transférer un seul
// octet d'image. Les images elles-mêmes ne sont lues que par les routes qui
// les servent réellement.

/** Identifiants des produits possédant une photo de couverture. */
export async function idsAvecCouverture(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const lignes = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`SELECT id FROM produits WHERE id IN (${Prisma.join(ids)}) AND image_url IS NOT NULL`
  );
  return new Set(lignes.map((l) => Number(l.id)));
}

/** Nombre de photos supplémentaires (galerie) par produit. */
export async function nbImagesParProduit(ids: number[]): Promise<Map<number, number>> {
  if (ids.length === 0) return new Map();
  const lignes = await prisma.produitImage.groupBy({
    by: ["produit_id"],
    where: { produit_id: { in: ids } },
    _count: { _all: true },
  });
  return new Map(lignes.map((l) => [l.produit_id, l._count._all]));
}

/** Vrai si le produit possède une photo de couverture (sans lire la donnée). */
export async function aUneCouverture(id: number): Promise<boolean> {
  const lignes = await prisma.$queryRaw<{ existe: boolean }[]>(
    Prisma.sql`SELECT (image_url IS NOT NULL) AS existe FROM produits WHERE id = ${id}`
  );
  return lignes[0]?.existe === true;
}
