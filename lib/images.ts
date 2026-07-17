export const TAILLE_MAX_PHOTO_OCTETS = 1_200_000;

const LONGUEUR_MAX_DATA_URL = 1_700_000;
const MOTIF_DATA_URL_IMAGE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const MOTIF_URL_DISTANTE = /^https:\/\/[^\s]+$/i;

export interface PhotoDecodee {
  mime: string;
  base64: string;
}

export function tailleOctetsBase64(base64: string): number {
  const bourrage = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - bourrage;
}

export function lireDataUrlImage(valeur: string): PhotoDecodee | null {
  if (valeur.length > LONGUEUR_MAX_DATA_URL) return null;
  const trouve = MOTIF_DATA_URL_IMAGE.exec(valeur);
  if (!trouve) return null;
  const mime = trouve[1];
  const base64 = trouve[2];
  if (!mime || !base64 || base64.length % 4 !== 0) return null;
  return { mime, base64 };
}

export function estUrlPhotoDistante(valeur: string): boolean {
  return MOTIF_URL_DISTANTE.test(valeur);
}

export function validerPhoto(valeur: string): string | null {
  if (estUrlPhotoDistante(valeur)) return null;
  if (valeur.length > LONGUEUR_MAX_DATA_URL) {
    return "La photo est trop lourde (1,2 Mo maximum).";
  }
  const photo = lireDataUrlImage(valeur);
  if (!photo) {
    return "La photo doit être une image JPEG, PNG ou WebP téléversée depuis l'appareil.";
  }
  if (tailleOctetsBase64(photo.base64) > TAILLE_MAX_PHOTO_OCTETS) {
    return "La photo est trop lourde (1,2 Mo maximum).";
  }
  return null;
}

export function urlPhotoProduit(produitId: number): string {
  return `/api/produits/${produitId}/image`;
}
