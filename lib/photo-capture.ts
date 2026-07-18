"use client";

import { Capacitor } from "@capacitor/core";
import { compresserDataUrl } from "@/lib/photo-client";

export function captureNativeDisponible(): boolean {
  return Capacitor.isNativePlatform();
}

export type SourcePhoto = "camera" | "galerie" | "prompt";

export type ResultatCapture =
  | { statut: "ok"; dataUrl: string }
  | { statut: "annule" }
  | { statut: "indisponible" };

// Messages renvoyés par Capacitor quand le plugin natif n'est pas embarqué dans
// la coquille Android (« Camera plugin is not implemented on android »).
const MOTS_INDISPONIBLE = [
  "not implemented",
  "unimplemented",
  "not available",
  "unavailable",
  "notimplemented",
];

/**
 * Tente la capture via le plugin natif Capacitor. Ne lève jamais pour un plugin
 * manquant : renvoie `indisponible` afin que l'appelant bascule sur l'input HTML
 * (qui fonctionne dans n'importe quelle WebView). Seule une erreur de traitement
 * d'image (photo trop lourde) est propagée pour être affichée à l'utilisateur.
 */
export async function capturerPhotoNative(
  source: SourcePhoto = "prompt"
): Promise<ResultatCapture> {
  let module: typeof import("@capacitor/camera");
  try {
    module = await import("@capacitor/camera");
  } catch {
    return { statut: "indisponible" };
  }
  const { Camera, CameraResultType, CameraSource } = module;
  const sourceCap =
    source === "camera"
      ? CameraSource.Camera
      : source === "galerie"
        ? CameraSource.Photos
        : CameraSource.Prompt;

  let brut: string | undefined;
  try {
    const photo = await Camera.getPhoto({
      quality: 70,
      width: 1280,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: sourceCap,
      promptLabelHeader: "Photo du produit",
      promptLabelCancel: "Annuler",
      promptLabelPhoto: "Choisir dans la galerie",
      promptLabelPicture: "Prendre une photo",
    });
    brut = photo.dataUrl;
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (message.includes("cancel") || message.includes("annul")) return { statut: "annule" };
    if (MOTS_INDISPONIBLE.some((m) => message.includes(m))) return { statut: "indisponible" };
    // Autre erreur native (plugin absent, permission indisponible…) : on bascule
    // sur l'input HTML plutôt que de bloquer l'utilisateur.
    return { statut: "indisponible" };
  }

  if (!brut) return { statut: "annule" };
  return { statut: "ok", dataUrl: await compresserDataUrl(brut) };
}
