"use client";

import { TAILLE_MAX_PHOTO_OCTETS, lireDataUrlImage, tailleOctetsBase64 } from "@/lib/images";

const COTES_MAX = [1280, 900, 640];
const QUALITES = [0.72, 0.55, 0.4];

interface SourceImage {
  source: CanvasImageSource;
  largeur: number;
  hauteur: number;
  liberer: () => void;
}

async function chargerFichier(fichier: File): Promise<SourceImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      largeur: bitmap.width,
      hauteur: bitmap.height,
      liberer: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(fichier);
  try {
    const image = await chargerElement(url);
    return {
      source: image,
      largeur: image.naturalWidth,
      hauteur: image.naturalHeight,
      liberer: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

async function chargerDataUrl(dataUrl: string): Promise<SourceImage> {
  const image = await chargerElement(dataUrl);
  return {
    source: image,
    largeur: image.naturalWidth,
    hauteur: image.naturalHeight,
    liberer: () => undefined,
  };
}

function chargerElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const element = new Image();
    element.onload = () => resoudre(element);
    element.onerror = () => rejeter(new Error("Image illisible."));
    element.src = src;
  });
}

function compresserSource({ source, largeur, hauteur }: SourceImage): string {
  if (largeur < 1 || hauteur < 1) throw new Error("Image illisible.");

  const canvas = document.createElement("canvas");
  const contexte = canvas.getContext("2d");
  if (!contexte) throw new Error("Impossible de préparer la photo sur cet appareil.");

  for (const cote of COTES_MAX) {
    const echelle = Math.min(1, cote / Math.max(largeur, hauteur));
    canvas.width = Math.max(1, Math.round(largeur * echelle));
    canvas.height = Math.max(1, Math.round(hauteur * echelle));
    contexte.drawImage(source, 0, 0, canvas.width, canvas.height);

    for (const qualite of QUALITES) {
      const dataUrl = canvas.toDataURL("image/jpeg", qualite);
      const photo = lireDataUrlImage(dataUrl);
      if (photo && tailleOctetsBase64(photo.base64) <= TAILLE_MAX_PHOTO_OCTETS) {
        return dataUrl;
      }
    }
  }

  throw new Error("Photo trop lourde : réessayez avec une image plus petite.");
}

export async function compresserPhoto(fichier: File): Promise<string> {
  if (!fichier.type.startsWith("image/")) {
    throw new Error("Le fichier choisi n'est pas une image.");
  }
  const chargee = await chargerFichier(fichier);
  try {
    return compresserSource(chargee);
  } finally {
    chargee.liberer();
  }
}

export async function compresserDataUrl(dataUrl: string): Promise<string> {
  const chargee = await chargerDataUrl(dataUrl);
  try {
    return compresserSource(chargee);
  } finally {
    chargee.liberer();
  }
}
