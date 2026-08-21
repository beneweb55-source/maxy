"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconeFermer } from "./icons";

export default function Modale({
  titre,
  ouverte,
  onFermer,
  large = false,
  children,
}: {
  titre: string;
  ouverte: boolean;
  onFermer: () => void;
  large?: boolean;
  children: React.ReactNode;
}) {
  // On utilise un portail React pour rendre la modale directement dans
  // document.body. Cela évite qu'un ancêtre avec `transform` (par exemple
  // la classe `animate-entree`) ne crée un nouveau « containing block » qui
  // empêcherait `position: fixed` de fonctionner par rapport au viewport.
  const [monté, setMonté] = useState(false);
  useEffect(() => setMonté(true), []);

  // Verrouille le défilement du body à l'ouverture de la modale.
  useEffect(() => {
    if (!ouverte) return;
    const style = document.body.style;
    const originalOverflow = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = originalOverflow;
    };
  }, [ouverte]);

  useEffect(() => {
    if (!ouverte) return;
    function surEchap(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    document.addEventListener("keydown", surEchap);
    return () => document.removeEventListener("keydown", surEchap);
  }, [ouverte, onFermer]);

  // Logique de Drag-to-dismiss (Swipe down) pour le mobile
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Si ce n'est pas un touch ou si on n'est pas sur mobile, on ignore.
    if (e.pointerType !== "touch" && e.pointerType !== "mouse") return;
    setIsDragging(true);
    startY.current = e.clientY;
    currentY.current = e.clientY;
    // On capture le pointeur pour continuer à recevoir les events même si on sort de l'élément
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY.current;
    // On ne permet de glisser que vers le bas
    if (deltaY > 0) {
      setOffsetY(deltaY);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);

    // Si on a glissé plus de 100px vers le bas, on ferme la modale
    if (offsetY > 100) {
      onFermer();
      setTimeout(() => setOffsetY(0), 300); // Reset après l'animation de fermeture
    } else {
      setOffsetY(0); // On rebondit
    }
  };

  if (!ouverte || !monté) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
    >
      {/* Fond sombre semi-transparent pour isoler la modale du contenu. */}
      <div
        className="absolute inset-0 bg-brand-smooth/40 dark:bg-black/70 backdrop-blur-sm animate-entree transition-colors"
        style={{ animationDuration: '0.3s' }}
        onClick={onFermer}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 flex max-h-[90dvh] sm:max-h-[calc(100dvh-2rem)] w-full ${
          large ? "max-w-2xl" : "max-w-md"
        } flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-brand-light-grey/80 bg-brand-white shadow-2xl safe-bottom`}
        style={{
          transform: `translateY(${offsetY}px)`,
          transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          // On garde l'animation d'entrée si pas de drag
          animation: offsetY === 0 && !isDragging ? 'entree-douce 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
        }}
      >
        {/* En-tête + Handle pour le Drag to dismiss */}
        <div 
          className="flex flex-col shrink-0 border-b border-brand-light-grey/40 bg-brand-paper/50 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Handle Mobile Uniquement */}
          <div className="flex w-full items-center justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1.5 w-12 rounded-full bg-brand-light-grey/80 dark:bg-brand-grey/50" />
          </div>
          
          <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-1 sm:px-6 sm:py-5">
            <h2 className="text-lg font-bold tracking-tight font-outfit text-brand-smooth">{titre}</h2>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              className="rounded-lg p-3 sm:p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/60 hover:text-brand-black active-scale"
            >
              <IconeFermer taille={18} />
            </button>
          </div>
        </div>
        
        {/* Contenu */}
        <div className="overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
