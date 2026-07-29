import { put } from "@vercel/blob";
import { lireDataUrlImage, estUrlPhotoDistante, extensionDepuisMime } from "@/lib/images";

// ---------------------------------------------------------------------------
// Stockage des photos hors base de données.
//
// Historiquement les photos étaient enregistrées en base64 directement dans
// `produits.image_url` / `produit_images.data`. Chaque lecture de produit
// transférait donc des méga-octets depuis Postgres, ce qui a épuisé le quota
// de transfert de la base.
//
// Désormais une photo est téléversée vers un stockage objet (Vercel Blob) et
// seule son URL publique est conservée en base. Les images sont servies par le
// CDN, sans passer par la base ni par une fonction serveur.
//
// Repli : si le stockage n'est pas configuré (jeton absent), on conserve
// l'ancien comportement (base64 en base) pour ne rien casser. Tout le code
// spécifique au fournisseur est confiné à ce fichier.
// ---------------------------------------------------------------------------

/** Le stockage objet est-il configuré sur cet environnement ? */
export function stockageObjetDisponible(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Téléverse une photo fournie en data-URL et renvoie son URL publique.
 * Renvoie la valeur d'origine si elle est déjà une URL distante, et `null`
 * si le stockage n'est pas configuré ou si le téléversement échoue
 * (l'appelant retombe alors sur l'enregistrement en base).
 */
export async function televerserPhoto(
  valeur: string,
  prefixe = "produits"
): Promise<string | null> {
  if (estUrlPhotoDistante(valeur)) return valeur; // déjà hébergée
  if (!stockageObjetDisponible()) return null;

  const photo = lireDataUrlImage(valeur);
  if (!photo) return null;

  try {
    const octets = Buffer.from(photo.base64, "base64");
    const extension = extensionDepuisMime(photo.mime);
    const resultat = await put(`${prefixe}/photo.${extension}`, octets, {
      access: "public",
      contentType: photo.mime,
      // Suffixe aléatoire ajouté au nom : deux photos ne s'écrasent jamais et
      // l'URL reste stable donc indéfiniment cachable par le CDN.
      addRandomSuffix: true,
    });
    return resultat.url;
  } catch (e) {
    console.error("Téléversement photo échoué (repli base de données)", e);
    return null;
  }
}

/**
 * Téléverse une liste de photos. Chaque élément renvoie soit son URL distante,
 * soit sa valeur d'origine si le téléversement n'est pas possible.
 */
export async function televerserPhotos(valeurs: string[], prefixe = "produits"): Promise<string[]> {
  const resultats: string[] = [];
  for (const valeur of valeurs) {
    const url = await televerserPhoto(valeur, prefixe);
    resultats.push(url ?? valeur);
  }
  return resultats;
}

/**
 * Téléverse les photos d'un ensemble de lignes produit AVANT l'écriture en
 * base (jamais pendant une transaction : le réseau la maintiendrait ouverte).
 *
 * Les lignes issues d'un ajout « en quantité » partagent le même tableau
 * `images` : le cache par référence garantit un seul téléversement, et les N
 * exemplaires créés pointent vers la même URL.
 *
 * Note : les URL étant ainsi partagées entre exemplaires jumeaux, on ne
 * supprime JAMAIS un objet du stockage lorsqu'un produit est supprimé — cela
 * ferait disparaître la photo de ses jumeaux. Un objet orphelin est sans
 * conséquence (coût de stockage négligeable, aucun transfert).
 */
export async function televerserLignes<T extends { images: string[] }>(
  lignes: T[]
): Promise<T[]> {
  const cache = new Map<string[], string[]>();
  const resultat: T[] = [];
  for (const ligne of lignes) {
    let images = cache.get(ligne.images);
    if (!images) {
      images = await televerserPhotos(ligne.images);
      cache.set(ligne.images, images);
    }
    resultat.push({ ...ligne, images });
  }
  return resultat;
}

/**
 * Récupère les octets d'une photo, qu'elle soit stockée en base (data-URL) ou
 * hébergée sur le stockage objet. Utilisé par l'export ZIP.
 */
export async function lireOctetsPhoto(
  valeur: string
): Promise<{ octets: Buffer; mime: string } | null> {
  const photo = lireDataUrlImage(valeur);
  if (photo) {
    return { octets: Buffer.from(photo.base64, "base64"), mime: photo.mime };
  }
  if (!estUrlPhotoDistante(valeur)) return null;
  try {
    const reponse = await fetch(valeur);
    if (!reponse.ok) return null;
    const octets = Buffer.from(await reponse.arrayBuffer());
    const mime = reponse.headers.get("content-type") ?? "image/jpeg";
    return { octets, mime };
  } catch (e) {
    console.error("Lecture photo distante échouée", e);
    return null;
  }
}
