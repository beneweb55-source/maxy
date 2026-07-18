"use client";

import { useEffect } from "react";
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
  // Verrouille le défilement de la page tant que la modale est ouverte :
  // le formulaire reste centré et l'arrière-plan ne défile pas. Dépend
  // uniquement de `ouverte` pour rester stable entre les rendus.
  useEffect(() => {
    if (!ouverte) return;
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowInitial;
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

  if (!ouverte) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
    >
      {/* Zone de clic pour fermer — volontairement transparente, sans fond
          sombre ni flou (backdrop retiré à la demande). */}
      <div className="absolute inset-0" onClick={onFermer} />
      <div
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full ${
          large ? "max-w-2xl" : "max-w-md"
        } flex-col overflow-hidden rounded-2xl border border-white/80 bg-brand-white shadow-2xl`}
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
    </div>
  );
}
