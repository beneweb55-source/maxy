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
      <div className="absolute inset-0 bg-brand-black/50" onClick={onFermer} />
      <div
        className={`relative w-full ${large ? "max-w-2xl" : "max-w-md"} rounded-2xl bg-brand-white p-6 shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-4">
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
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
