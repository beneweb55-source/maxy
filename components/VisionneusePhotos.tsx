"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/contexte";
import {
  IconeChevronGauche,
  IconeChevronDroite,
  IconeFermer,
  IconeTelechargement,
} from "@/components/icons";

/**
 * Aperçu plein écran d'une galerie de photos (lightbox) : navigation clavier
 * (← → Échap), flèches, vignettes et téléchargement de la photo affichée.
 * Rendu via un portail dans document.body (même raison que Modale : un ancêtre
 * avec `transform` casserait `position: fixed`), au-dessus des modales (z-50).
 */
export default function VisionneusePhotos({
  photos,
  index,
  onFermer,
  onNaviguer,
  lienTelechargement,
  titre,
}: {
  photos: string[];
  index: number;
  onFermer: () => void;
  onNaviguer: (index: number) => void;
  /** URL de téléchargement de la photo i ; omis pour un aperçu local (ajout). */
  lienTelechargement?: (index: number) => string;
  titre?: string;
}) {
  const t = useT();
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  const n = photos.length;
  const i = Math.min(Math.max(index, 0), n - 1);

  // Capture au niveau document AVANT les écouteurs de Modale : Échap ne doit
  // fermer que l'aperçu, pas la modale d'ajout/édition en dessous.
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onFermer();
      } else if (e.key === "ArrowLeft" && n > 1) {
        onNaviguer((i - 1 + n) % n);
      } else if (e.key === "ArrowRight" && n > 1) {
        onNaviguer((i + 1) % n);
      }
    }
    document.addEventListener("keydown", surTouche, true);
    return () => document.removeEventListener("keydown", surTouche, true);
  }, [i, n, onFermer, onNaviguer]);

  // Verrouille le défilement du fond (restaure l'état précédent en sortie).
  useEffect(() => {
    const style = document.body.style;
    const avant = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = avant;
    };
  }, []);

  const src = photos[i];
  if (!monte || n === 0 || src === undefined) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={titre ?? t("visionneuse.apercu")}
      onClick={onFermer}
    >
      {/* Barre supérieure : compteur / titre + actions */}
      <div
        className="flex shrink-0 items-center justify-between gap-2 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
          {titre ? `${titre} · ` : ""}
          {t("visionneuse.compteur", { n: i + 1, total: n })}
        </span>
        <div className="flex items-center gap-2">
          {lienTelechargement && (
            <a
              href={lienTelechargement(i)}
              onClick={(e) => e.stopPropagation()}
              title={t("visionneuse.telecharger")}
              aria-label={t("visionneuse.telecharger")}
              className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
            >
              <IconeTelechargement taille={18} />
            </a>
          )}
          <button
            type="button"
            onClick={onFermer}
            aria-label={t("visionneuse.fermer")}
            className="rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
          >
            <IconeFermer taille={18} />
          </button>
        </div>
      </div>

      {/* Photo centrale */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <img
          src={src}
          alt={t("visionneuse.compteur", { n: i + 1, total: n })}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNaviguer((i - 1 + n) % n);
              }}
              aria-label={t("visionneuse.precedente")}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
            >
              <IconeChevronGauche taille={22} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNaviguer((i + 1) % n);
              }}
              aria-label={t("visionneuse.suivante")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
            >
              <IconeChevronDroite taille={22} />
            </button>
          </>
        )}
      </div>

      {/* Vignettes de navigation */}
      {n > 1 && (
        <div
          className="flex shrink-0 justify-center gap-2 overflow-x-auto p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((vignette, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNaviguer(idx)}
              aria-label={t("visionneuse.compteur", { n: idx + 1, total: n })}
              className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition ${
                idx === i ? "border-brand-orange" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={vignette} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
