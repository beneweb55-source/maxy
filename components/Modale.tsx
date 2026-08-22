"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { IconeFermer } from "./icons";

export default function Modale({
  titre,
  ouverte,
  onFermer,
  large = false,
  modificationsNonEnregistrees = false,
  children,
}: {
  titre: string;
  ouverte: boolean;
  onFermer: () => void;
  large?: boolean;
  modificationsNonEnregistrees?: boolean;
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

  const onFermerRef = useRef(onFermer);
  const isDirtyRef = useRef(modificationsNonEnregistrees);
  useEffect(() => {
    onFermerRef.current = onFermer;
  }, [onFermer]);
  useEffect(() => {
    isDirtyRef.current = modificationsNonEnregistrees;
  }, [modificationsNonEnregistrees]);

  const tenterFermeture = () => {
    if (isDirtyRef.current) {
      if (window.confirm("Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?")) {
        onFermerRef.current();
      } else {
        // L'utilisateur a annulé la fermeture. On s'assure de repousser l'état history si c'était un popstate
        if (etaitOuverte.current && window.history.state?.modalId !== idRef.current) {
          window.history.pushState({ modalId: idRef.current }, "");
        }
      }
    } else {
      onFermerRef.current();
    }
  };

  const idRef = useRef(`modal-${Math.random().toString(36).substring(2, 9)}`);
  const etaitOuverte = useRef(false);

  // Gestion de l'historique pour le bouton "Retour" (Android ou navigateur)
  useEffect(() => {
    if (ouverte) {
      function surEchap(e: KeyboardEvent) {
        if (e.key === "Escape") tenterFermeture();
      }
      document.addEventListener("keydown", surEchap);

      const handlePopState = (e: PopStateEvent) => {
        // L'utilisateur a utilisé le bouton "Retour", l'état modalId a disparu
        if (e.state?.modalId !== idRef.current) {
          tenterFermeture();
        }
      };
      window.addEventListener("popstate", handlePopState);

      // On pousse un état dans l'historique SEULEMENT si on vient de s'ouvrir
      if (!etaitOuverte.current && window.history.state?.modalId !== idRef.current) {
        // On conserve l'état de Next.js pour ne pas casser son routeur
        window.history.pushState({ ...window.history.state, modalId: idRef.current }, "");
      }
      etaitOuverte.current = true;

      return () => {
        document.removeEventListener("keydown", surEchap);
        window.removeEventListener("popstate", handlePopState);
        // On ne fait PAS history.back() ici car cela cause des race conditions
        // si React unmount et remount rapidement. On gérera le back dans le useEffect
        // lors de la transition ouverte -> fermée.
      };
    } else if (etaitOuverte.current) {
      // Transition Ouverte -> Fermée
      etaitOuverte.current = false;
      if (window.history.state?.modalId === idRef.current) {
        window.history.back();
      }
    }
  }, [ouverte, tenterFermeture]);

  // Logique de Drag-to-dismiss (Swipe down) pour le mobile
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Si ce n'est pas un touch ou si on n'est pas sur mobile, on ignore.
    if (e.pointerType !== "touch" && e.pointerType !== "mouse") return;
    setIsDragging(true);
    startY.current = e.clientY;
    currentY.current = 0;
    if (modalRef.current) {
      modalRef.current.style.transition = "none";
    }
    // On capture le pointeur pour continuer à recevoir les events même si on sort de l'élément
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY.current;
    // On ne permet de glisser que vers le bas
    if (deltaY > 0) {
      currentY.current = deltaY;
      if (modalRef.current) {
        // translate3d force l'accélération matérielle (120 FPS constant)
        modalRef.current.style.transform = `translate3d(0, ${deltaY}px, 0)`;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);

    // Seuil plus réactif : 60px pour fermer
    if (currentY.current > 60) {
      if (modalRef.current) {
        modalRef.current.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        modalRef.current.style.transform = `translate3d(0, 100%, 0)`;
      }
      tenterFermeture();
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.style.transform = "";
          currentY.current = 0;
        }
      }, 300);
    } else {
      // On rebondit
      if (modalRef.current) {
        modalRef.current.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        modalRef.current.style.transform = `translate3d(0, 0, 0)`;
      }
      currentY.current = 0;
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-entree"
        style={{ animationDuration: '0.3s' }}
        onClick={tenterFermeture}
      />
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 flex max-h-[90dvh] sm:max-h-[calc(100dvh-2rem)] w-full ${
          large ? "max-w-2xl" : "max-w-md"
        } flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-brand-light-grey/80 bg-brand-white shadow-2xl safe-bottom`}
        style={{
          // On garde l'animation d'entrée si pas de drag
          animation: !isDragging && currentY.current === 0 ? 'entree-douce 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
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
            <div className="h-1.5 w-12 rounded-full bg-brand-grey/30" />
          </div>
          
          <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-1 sm:px-6 sm:py-5">
            <h2 className="text-lg font-bold tracking-tight font-outfit text-brand-smooth">{titre}</h2>
            <button
              type="button"
              onClick={tenterFermeture}
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
