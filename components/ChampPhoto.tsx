"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { useT } from "@/lib/i18n/contexte";
import { compresserPhoto } from "@/lib/photo-client";
import {
  capturerPhotoNative,
  captureNativeDisponible,
  priseDePhotoDisponible,
  type SourcePhoto,
} from "@/lib/photo-capture";
import { IconeAppareilPhoto, IconeCorbeille, IconeImage } from "@/components/icons";

export default function ChampPhoto({
  apercu,
  onCapturer,
  onRetirer,
  disabled = false,
}: {
  apercu: string | null;
  onCapturer: (dataUrl: string) => void;
  onRetirer: () => void;
  disabled?: boolean;
}) {
  const { afficher } = useToast();
  const t = useT();
  const champCamera = useRef<HTMLInputElement>(null);
  const champGalerie = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  // Déterminé après montage pour éviter tout décalage d'hydratation : la prise
  // de photo est masquée sur ordinateur (desktop), où elle n'est pas possible.
  const [photoDisponible, setPhotoDisponible] = useState(false);
  useEffect(() => setPhotoDisponible(priseDePhotoDisponible()), []);

  async function declencher(source: Exclude<SourcePhoto, "prompt">) {
    if (captureNativeDisponible()) {
      setEnCours(true);
      try {
        const res = await capturerPhotoNative(source);
        if (res.statut === "ok") {
          onCapturer(res.dataUrl);
          return;
        }
        if (res.statut === "annule") return;
        // res.statut === "indisponible" → repli sur l'input HTML ci-dessous.
      } catch (e) {
        afficher(e instanceof Error ? e.message : t("champPhoto.echecCapture"), "erreur");
        return;
      } finally {
        setEnCours(false);
      }
    }
    (source === "camera" ? champCamera : champGalerie).current?.click();
  }

  async function surFichier(evenement: React.ChangeEvent<HTMLInputElement>) {
    const fichier = evenement.target.files?.[0];
    evenement.target.value = "";
    if (!fichier) return;
    setEnCours(true);
    try {
      onCapturer(await compresserPhoto(fichier));
    } catch (e) {
      afficher(e instanceof Error ? e.message : t("champPhoto.illisible"), "erreur");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <input
        ref={champCamera}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void surFichier(e)}
        className="hidden"
      />
      <input
        ref={champGalerie}
        type="file"
        accept="image/*"
        onChange={(e) => void surFichier(e)}
        className="hidden"
      />
      {apercu ? (
        <div className="flex flex-wrap items-center gap-3">
          <img
            src={apercu}
            alt={t("champPhoto.apercuAlt")}
            className="h-16 w-16 shrink-0 rounded-lg border border-brand-light-grey object-cover"
          />
          {photoDisponible && (
            <button
              type="button"
              disabled={disabled || enCours}
              onClick={() => void declencher("camera")}
              className="btn btn-secondaire"
            >
              <IconeAppareilPhoto taille={14} />
              {enCours ? t("champPhoto.traitement") : t("champPhoto.reprendre")}
            </button>
          )}
          <button
            type="button"
            disabled={disabled || enCours}
            onClick={() => void declencher("galerie")}
            className="btn btn-secondaire"
          >
            <IconeImage taille={14} />
            {t("champPhoto.galerie")}
          </button>
          <button
            type="button"
            disabled={disabled || enCours}
            onClick={onRetirer}
            aria-label={t("champPhoto.retirer")}
            className="btn border border-danger/30 bg-brand-white text-danger hover:bg-danger/10"
          >
            <IconeCorbeille taille={14} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {photoDisponible && (
            <button
              type="button"
              disabled={disabled || enCours}
              onClick={() => void declencher("camera")}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-grey bg-brand-paper px-4 py-3 text-sm font-semibold text-brand-smooth transition hover:border-brand-orange hover:bg-brand-glow/25 hover:text-brand-orange disabled:opacity-45"
            >
              <IconeAppareilPhoto taille={18} />
              {enCours ? t("champPhoto.preparation") : t("champPhoto.prendrePhoto")}
            </button>
          )}
          <button
            type="button"
            disabled={disabled || enCours}
            onClick={() => void declencher("galerie")}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-grey bg-brand-paper px-4 py-3 text-sm font-semibold text-brand-smooth transition hover:border-brand-orange hover:bg-brand-glow/25 hover:text-brand-orange disabled:opacity-45"
          >
            <IconeImage taille={18} />
            {t("champPhoto.importerGalerie")}
          </button>
        </div>
      )}
    </div>
  );
}
