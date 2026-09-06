"use client";

import { useState, useRef } from "react";
import { IconeImage, IconeChevronGauche, IconeChevronDroite } from "@/components/icons";

interface GalerieCarteProps {
  images: string[];
  reference: string;
}

export default function GalerieCarte({ images, reference }: GalerieCarteProps) {
  const [indexCourant, setIndexCourant] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Si pas d'image
  if (!images || images.length === 0) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-brand-paper dark:bg-white/[0.03] text-brand-light-grey dark:text-white/20">
        <IconeImage taille={32} />
      </span>
    );
  }

  // Si une seule image
  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt={`Photo de ${reference}`}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    );
  }

  // Plus d'une image : mode Galerie
  const urlCourante = images[indexCourant];

  const handleTouchStart = (e: React.TouchEvent) => {
    // Stoppe la propagation pour éviter que le composant de swipe du menu latéral ne prenne le dessus
    e.stopPropagation();
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0]!.clientX;
      touchStartY.current = e.touches[0]!.clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Important de stopper la propagation pour que useSwipeMenu (sur le document)
    // ne détecte pas le mouvement horizontal.
    e.stopPropagation();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStartX.current === null || touchStartY.current === null) return;
    if (e.changedTouches.length === 0) return;

    const touchEndX = e.changedTouches[0]!.clientX;
    const touchEndY = e.changedTouches[0]!.clientY;

    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    // Si on a plus scrollé verticalement qu'horizontalement, c'est un scroll page, on l'ignore.
    if (Math.abs(diffY) > Math.abs(diffX)) return;

    // Seuil de détection du swipe (40px)
    if (Math.abs(diffX) > 40) {
      // Swipe détecté : on empêche ce geste d'être considéré comme un clic (tap) par le parent
      // Note: e.preventDefault() sur touchEnd peut perturber certains navigateurs, 
      // on utilise plutôt le stopPropagation qui empêche le clic de remonter au bouton parent.
      
      if (diffX > 0) {
        // Swipe droite -> Précédent
        setIndexCourant((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      } else {
        // Swipe gauche -> Suivant
        setIndexCourant((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    }
  };

  const navPrec = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIndexCourant((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const navSuiv = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIndexCourant((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="relative h-full w-full bg-brand-paper dark:bg-white/[0.03]"
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image with smooth crossfade and gentle zoom on hover */}
      <img
        key={urlCourante}
        src={urlCourante}
        alt={`Photo ${indexCourant + 1} de ${reference}`}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover animate-fade-in transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />

      {/* Desktop arrows — high contrast, visible on hover */}
      <div className="absolute inset-y-0 left-0 hidden items-center opacity-0 transition-all duration-200 group-hover:opacity-100 sm:flex">
        <button
          type="button"
          onClick={navPrec}
          className="m-1.5 rounded-full bg-white/90 dark:bg-white/80 p-1.5 text-brand-black dark:text-black shadow-lg backdrop-blur-sm transition-transform hover:scale-110 hover:bg-white"
          title="Précédent"
        >
          <IconeChevronGauche taille={14} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 hidden items-center opacity-0 transition-all duration-200 group-hover:opacity-100 sm:flex">
        <button
          type="button"
          onClick={navSuiv}
          className="m-1.5 rounded-full bg-white/90 dark:bg-white/80 p-1.5 text-brand-black dark:text-black shadow-lg backdrop-blur-sm transition-transform hover:scale-110 hover:bg-white"
          title="Suivant"
        >
          <IconeChevronDroite taille={14} />
        </button>
      </div>

      {/* Indicator dots — active dot expands, pill shape */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-black/50 dark:bg-black/60 px-2.5 py-1 backdrop-blur-md">
            {images.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ease-out ${
                  i === indexCourant
                    ? "h-1.5 w-4 bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                    : "h-1.5 w-1.5 bg-white/35 hover:bg-white/55"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
