"use client";

import { Capacitor } from "@capacitor/core";
import { compresserDataUrl } from "@/lib/photo-client";

export function captureNativeDisponible(): boolean {
  return Capacitor.isNativePlatform();
}

export async function capturerPhotoNative(): Promise<string | null> {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  try {
    const photo = await Camera.getPhoto({
      quality: 70,
      width: 1280,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelHeader: "Photo du produit",
      promptLabelCancel: "Annuler",
      promptLabelPhoto: "Choisir dans la galerie",
      promptLabelPicture: "Prendre une photo",
    });
    if (!photo.dataUrl) return null;
    return await compresserDataUrl(photo.dataUrl);
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (message.includes("cancel") || message.includes("annul")) return null;
    throw e instanceof Error ? e : new Error("Échec de la capture photo.");
  }
}
