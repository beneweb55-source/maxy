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

  if (!ouverte || !monté) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
    >
      {/* Fond sombre semi-transparent pour isoler la modale du contenu. */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onFermer}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 flex max-h-[calc(100dvh-2rem)] w-full ${
          large ? "max-w-2xl" : "max-w-md"
        } flex-col overflow-hidden rounded-2xl border border-brand-light-grey bg-brand-white shadow-2xl`}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-brand-light-grey/70 px-6 py-4">
          <h2 className="text-base font-bold tracking-tight">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/60 hover:text-brand-black"
          >
            <IconeFermer taille={18} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
