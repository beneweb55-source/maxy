"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { useT } from "@/lib/i18n/contexte";
import { compresserPhoto } from "@/lib/photo-client";
import {
  capturerPhotoNative,
  captureNativeDisponible,
  priseDePhotoDisponible,
} from "@/lib/photo-capture";
import { MAX_PHOTOS_PRODUIT } from "@/lib/validation";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import {
  IconeAppareilPhoto,
  IconeCorbeille,
  IconeEtoile,
  IconeImage,
} from "@/components/icons";

/**
 * Champ de saisie multi-photos. La première photo du tableau est la couverture.
 * `photos` peut mélanger des data-URL (nouvelles) et des URL servies (existantes) :
 * les deux s'affichent, et sont renvoyées telles quelles dans `onChange`.
 */
export default function ChampPhotos({
  photos,
  onChange,
  disabled = false,
  max = MAX_PHOTOS_PRODUIT,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  disabled?: boolean;
  max?: number;
}) {
  const { afficher } = useToast();
  const t = useT();
  const champCamera = useRef<HTMLInputElement>(null);
  const champGalerie = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [photoDisponible, setPhotoDisponible] = useState(false);
  // Index de la photo affichée en plein écran (null = aperçu fermé).
  const [apercu, setApercu] = useState<number | null>(null);
  useEffect(() => setPhotoDisponible(priseDePhotoDisponible()), []);

  const plein = photos.length >= max;

  function ajouter(nouvelles: string[]) {
    if (nouvelles.length === 0) return;
    const place = Math.max(0, max - photos.length);
    if (place === 0) {
      afficher(t("champPhotos.max", { max }), "erreur");
      return;
    }
    if (nouvelles.length > place) {
      afficher(t("champPhotos.max", { max }), "erreur");
    }
    onChange([...photos, ...nouvelles.slice(0, place)]);
  }

  async function declencherCamera() {
    if (plein) {
      afficher(t("champPhotos.max", { max }), "erreur");
      return;
    }
    if (captureNativeDisponible()) {
      setEnCours(true);
      try {
        const res = await capturerPhotoNative("camera");
        if (res.statut === "ok") {
          ajouter([res.dataUrl]);
          return;
        }
        if (res.statut === "annule") return;
        // indisponible → repli sur l'input HTML ci-dessous.
      } catch (e) {
        afficher(e instanceof Error ? e.message : t("champPhotos.echecCapture"), "erreur");
        return;
      } finally {
        setEnCours(false);
      }
    }
    champCamera.current?.click();
  }

  async function surFichiers(evenement: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(evenement.target.files ?? []);
    evenement.target.value = "";
    if (fichiers.length === 0) return;
    setEnCours(true);
    try {
      const compressees: string[] = [];
      for (const fichier of fichiers) {
        try {
          compressees.push(await compresserPhoto(fichier));
        } catch (e) {
          afficher(e instanceof Error ? e.message : t("champPhotos.illisible"), "erreur");
        }
      }
      ajouter(compressees);
    } finally {
      setEnCours(false);
    }
  }

  function retirer(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  function definirCouverture(index: number) {
    if (index === 0) return;
    const suivant = [...photos];
    const [choisie] = suivant.splice(index, 1);
    if (choisie) suivant.unshift(choisie);
    onChange(suivant);
  }

  return (
    <div className="space-y-3">
      <input
        ref={champCamera}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void surFichiers(e)}
        className="hidden"
      />
      <input
        ref={champGalerie}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => void surFichiers(e)}
        className="hidden"
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((src, index) => (
            <div
              key={`${index}-${src.slice(0, 32)}`}
              className="relative aspect-square overflow-hidden rounded-lg border border-brand-light-grey bg-brand-paper"
            >
              <button
                type="button"
                onClick={() => setApercu(index)}
                title={t("champPhotos.agrandir")}
                aria-label={t("champPhotos.agrandir")}
                className="block h-full w-full cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={t("champPhotos.couverture")}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
              {index === 0 && (
                <span className="pointer-events-none absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-brand-orange px-1.5 py-0.5 text-[10px] font-bold text-brand-white shadow">
                  <IconeEtoile taille={10} />
                  {t("champPhotos.couverture")}
                </span>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/55 to-transparent p-1">
                {index !== 0 && (
                  <button
                    type="button"
                    disabled={disabled || enCours}
                    onClick={() => definirCouverture(index)}
                    title={t("champPhotos.definirCouverture")}
                    aria-label={t("champPhotos.definirCouverture")}
                    className="pointer-events-auto rounded-md bg-brand-white/90 p-1 text-brand-black transition hover:bg-brand-white"
                  >
                    <IconeEtoile taille={13} />
                  </button>
                )}
                <button
                  type="button"
                  disabled={disabled || enCours}
                  onClick={() => retirer(index)}
                  title={t("champPhotos.retirer")}
                  aria-label={t("champPhotos.retirer")}
                  className="pointer-events-auto rounded-md bg-brand-white/90 p-1 text-danger transition hover:bg-brand-white"
                >
                  <IconeCorbeille taille={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {photoDisponible && (
          <button
            type="button"
            disabled={disabled || enCours || plein}
            onClick={() => void declencherCamera()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-grey bg-brand-paper px-4 py-3 text-sm font-semibold text-brand-smooth transition hover:border-brand-orange hover:bg-brand-glow/25 hover:text-brand-orange disabled:opacity-45"
          >
            <IconeAppareilPhoto taille={18} />
            {enCours ? t("champPhotos.preparation") : t("champPhotos.prendrePhoto")}
          </button>
        )}
        <button
          type="button"
          disabled={disabled || enCours || plein}
          onClick={() => champGalerie.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-grey bg-brand-paper px-4 py-3 text-sm font-semibold text-brand-smooth transition hover:border-brand-orange hover:bg-brand-glow/25 hover:text-brand-orange disabled:opacity-45"
        >
          <IconeImage taille={18} />
          {enCours ? t("champPhotos.traitement") : t("champPhotos.ajouterPhotos")}
        </button>
      </div>

      <p className="text-xs text-brand-warm-grey">
        {photos.length === 0
          ? t("champPhotos.vide")
          : t("champPhotos.compteur", { n: photos.length, max })}
      </p>

      {apercu !== null && photos.length > 0 && (
        <VisionneusePhotos
          photos={photos}
          index={apercu}
          onFermer={() => setApercu(null)}
          onNaviguer={setApercu}
        />
      )}
    </div>
  );
}
