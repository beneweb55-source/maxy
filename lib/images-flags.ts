import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { urlPhotoProduit, urlPhotoSupplementaire } from "@/lib/images";

// Les photos sont désormais hébergées sur un stockage objet : la base ne
// contient qu'une URL courte. Restent toutefois les photos historiques encore
// stockées en base64 dans la même colonne, tant que la migration n'a pas été
// lancée (voir scripts/migrer-photos-vers-blob.mjs).
//
// Ces helpers ne transfèrent JAMAIS de base64 : la requête ne renvoie l'URL
// que lorsqu'il s'agit réellement d'une URL (`http…`), sinon un simple booléen
// « cette photo existe ». L'appelant sert alors la photo via la route proxy.

export interface InfoPhoto {
  /** Une photo existe pour cet élément. */
  existe: boolean;
  /** URL publique directe (CDN) si la photo est hébergée, sinon `null`. */
  url: string | null;
}

/** Couvertures des produits demandés : URL directe ou simple présence. */
export async function couverturesProduits(ids: number[]): Promise<Map<number, InfoPhoto>> {
  if (ids.length === 0) return new Map();
  const lignes = await prisma.$queryRaw<{ id: number; url: string | null }[]>(
    Prisma.sql`
      SELECT id, CASE WHEN image_url LIKE 'http%' THEN image_url ELSE NULL END AS url
      FROM produits
      WHERE id IN (${Prisma.join(ids)}) AND image_url IS NOT NULL
    `
  );
  return new Map(lignes.map((l) => [Number(l.id), { existe: true, url: l.url }]));
}

/** Couverture d'un seul produit. */
export async function couvertureProduit(id: number): Promise<InfoPhoto> {
  const lignes = await prisma.$queryRaw<{ url: string | null; existe: boolean }[]>(
    Prisma.sql`
      SELECT (image_url IS NOT NULL) AS existe,
             CASE WHEN image_url LIKE 'http%' THEN image_url ELSE NULL END AS url
      FROM produits WHERE id = ${id}
    `
  );
  const l = lignes[0];
  return { existe: l?.existe === true, url: l?.url ?? null };
}

/** Photos de galerie d'un produit : URL directe quand elle est hébergée. */
export async function galerieProduit(produitId: number): Promise<{ id: number; url: string | null }[]> {
  const lignes = await prisma.$queryRaw<{ id: number; url: string | null }[]>(
    Prisma.sql`
      SELECT id, CASE WHEN data LIKE 'http%' THEN data ELSE NULL END AS url
      FROM produit_images
      WHERE produit_id = ${produitId}
      ORDER BY position ASC
    `
  );
  return lignes.map((l) => ({ id: Number(l.id), url: l.url }));
}

/**
 * URL à afficher pour la couverture d'un produit : l'URL publique du CDN
 * quand la photo est hébergée (aucun passage par le serveur), sinon la route
 * proxy qui décode la photo encore stockée en base. `null` s'il n'y en a pas.
 */
export function urlCouverture(info: InfoPhoto | undefined, produitId: number): string | null {
  if (!info?.existe) return null;
  return info.url ?? urlPhotoProduit(produitId);
}

/** Idem pour une photo de galerie. */
export function urlGalerie(
  photo: { id: number; url: string | null },
  produitId: number
): string {
  return photo.url ?? urlPhotoSupplementaire(produitId, photo.id);
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
