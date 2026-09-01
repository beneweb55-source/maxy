"use client";

import React, { useEffect, useState, useRef } from "react";
import { Search, X, Scan, Barcode } from "lucide-react";

interface RechercheMultiModalProps {
  valeur: string;
  onChange: (valeur: string) => void;
  onInstantChange?: (valeur: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RechercheMultiModal({
  valeur,
  onChange,
  onInstantChange,
  placeholder = "Rechercher par modèle, S/N, code-barres (ex: M24-001)...",
  className = "",
}: RechercheMultiModalProps) {
  const [interne, setInterne] = useState(valeur);
  const [isBarcodeBurst, setIsBarcodeBurst] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerDebounce = useRef<NodeJS.Timeout | null>(null);

  // Timing pour détection des scans douchette
  const lastKeyTime = useRef<number>(0);
  const burstCharCount = useRef<number>(0);

  // Synchronisation avec la valeur externe (URL)
  useEffect(() => {
    setInterne(valeur);
  }, [valeur]);

  // Raccourci global clavier : touche "/" ou "F2" pour focaliser immédiatement la recherche
  useEffect(() => {
    function handleGlobalShortcuts(e: KeyboardEvent) {
      if (
        (e.key === "/" && (e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") ||
        e.key === "F2"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, []);

  const gererChangement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nouv = e.target.value;
    const now = Date.now();
    const interval = now - lastKeyTime.current;
    lastKeyTime.current = now;

    // Détection de la cadence douchette (< 45ms entre les frappes)
    if (interval < 45 && interval > 0) {
      burstCharCount.current += 1;
    } else {
      burstCharCount.current = 0;
    }

    const isFast = burstCharCount.current >= 3;
    setIsBarcodeBurst(isFast);

    setInterne(nouv);
    if (onInstantChange) onInstantChange(nouv);

    if (timerDebounce.current) clearTimeout(timerDebounce.current);

    // Si c'est un scan douchette, on applique sans délai, sinon debounce 200ms
    if (isFast) {
      onChange(nouv.trim());
    } else {
      timerDebounce.current = setTimeout(() => {
        onChange(nouv.trim());
        setIsBarcodeBurst(false);
      }, 220);
    }
  };

  const gererKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (timerDebounce.current) clearTimeout(timerDebounce.current);
      onChange(interne.trim());
      setIsBarcodeBurst(false);
    } else if (e.key === "Escape") {
      effacer();
    }
  };

  const effacer = () => {
    setInterne("");
    if (onInstantChange) onInstantChange("");
    onChange("");
    setIsBarcodeBurst(false);
    if (timerDebounce.current) clearTimeout(timerDebounce.current);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Icône dynamique Scan vs Recherche */}
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-brand-warm-grey">
        {isBarcodeBurst ? (
          <Barcode className="w-4 h-4 text-brand-orange animate-pulse" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={interne}
        onChange={gererChangement}
        onKeyDown={gererKeyDown}
        placeholder={placeholder}
        className="w-full min-h-[44px] pl-10 pr-20 py-2.5 text-xs sm:text-sm bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange font-medium text-brand-black dark:text-white transition-all shadow-2xs placeholder:text-brand-warm-grey/70"
      />

      {/* Raccourci / Statut Douchette / Bouton Reset */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {isBarcodeBurst && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-brand-orange/15 text-brand-orange px-1.5 py-0.5 rounded">
            <Scan className="w-3 h-3" /> SCAN
          </span>
        )}

        {!interne && (
          <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-brand-warm-grey/60 border border-brand-light-grey/60 dark:border-white/10 rounded px-1.5 py-0.5">
            /
          </span>
        )}

        {interne && (
          <button
            type="button"
            onClick={effacer}
            className="p-1 rounded-lg text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 transition-colors"
            title="Effacer la recherche (Échap)"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
