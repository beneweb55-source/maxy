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
      <span className="flex h-full w-full items-center justify-center bg-brand-paper dark:bg-white/10 text-brand-grey dark:text-brand-warm-grey">
        <IconeImage taille={28} />
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
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
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
      className="relative h-full w-full bg-brand-paper dark:bg-white/10"
      style={{ touchAction: "pan-y" }} // Autorise le scroll vertical mais capture le horizontal
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        key={urlCourante}
        src={urlCourante}
        alt={`Photo ${indexCourant + 1} de ${reference}`}
        loading="lazy"
        className="h-full w-full object-cover animate-fade-in transition duration-300 group-hover:scale-[1.03]"
      />
      
      {/* Flèches pour usage Desktop (affichées au hover via CSS Tailwind) */}
      <div className="absolute inset-y-0 left-0 hidden items-center opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
        <button
          type="button"
          onClick={navPrec}
          className="m-1 rounded-full bg-brand-white/80 p-1 text-brand-black shadow backdrop-blur hover:bg-brand-white"
          title="Précédent"
        >
          <IconeChevronGauche taille={16} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 hidden items-center opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
        <button
          type="button"
          onClick={navSuiv}
          className="m-1 rounded-full bg-brand-white/80 p-1 text-brand-black shadow backdrop-blur hover:bg-brand-white"
          title="Suivant"
        >
          <IconeChevronDroite taille={16} />
        </button>
      </div>

      {/* Indicateur de position (dots/texte) en bas de l'image */}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
        <div className="flex gap-1.5 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === indexCourant ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
