"use client";

import { useEffect, useState, useRef } from "react";
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
  nomTelechargement,
  titre,
}: {
  photos: string[];
  index: number;
  onFermer: () => void;
  onNaviguer: (index: number) => void;
  /** URL de téléchargement de la photo i ; omis pour masquer le bouton. */
  lienTelechargement?: (index: number) => string;
  /**
   * Nom de fichier suggéré (attribut `download`). Indispensable quand le lien
   * est une data-URL (photo pas encore enregistrée) ; pour une URL servie par
   * l'app, le serveur impose déjà son nom via Content-Disposition.
   */
  nomTelechargement?: (index: number) => string;
  titre?: string;
}) {
  const t = useT();
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  const n = photos.length;
  const i = Math.min(Math.max(index, 0), n - 1);

  // --- Gestion du swipe ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startX = useRef(0);

  const onDragStart = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" && e.pointerType !== "mouse") return;
    setIsDragging(true);
    startX.current = e.clientX;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX.current;
    let appliedOffset = deltaX;
    // Résistance aux bords du carrousel
    if ((i === 0 && deltaX > 0) || (i === n - 1 && deltaX < 0)) {
      appliedOffset = deltaX * 0.3;
    }
    setDragOffset(appliedOffset);
  };

  const onDragEnd = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
    
    if (Math.abs(dragOffset) > 60 && n > 1) {
      if (dragOffset > 0 && i > 0) {
        onNaviguer(i - 1);
      } else if (dragOffset < 0 && i < n - 1) {
        onNaviguer(i + 1);
      }
    }
    setDragOffset(0);
  };

  const onDragCancel = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
    setDragOffset(0);
  };

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
    
    return () => {
      document.removeEventListener("keydown", surTouche, true);
    };
  }, [onFermer, onNaviguer, n, i]);

  // Interception du bouton retour Android pour fermer la visionneuse
  useEffect(() => {
    // On conserve l'état Next.js pour ne pas désynchroniser le routeur
    window.history.pushState({ ...window.history.state, visionneuseOpen: true }, "");

    const handlePopState = () => onFermer();
    
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.visionneuseOpen) {
        window.history.back();
      }
    };
  }, [onFermer]);

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
              download={nomTelechargement ? nomTelechargement(i) : undefined}
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
      <div 
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 touch-none"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragCancel}
      >
        <img
          src={src}
          alt={t("visionneuse.compteur", { n: i + 1, total: n })}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl select-none"
          draggable={false}
          style={{
            transform: `translateX(${dragOffset}px)`,
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
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
