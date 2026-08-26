"use client";

import { useEffect, useState, useRef } from "react";
import { IconeRecherche, IconeFermer } from "@/components/icons";

interface RechercheRapideProps {
  valeur: string;
  onChange: (valeur: string) => void;
  onInstantChange?: (valeur: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export default function RechercheRapide({
  valeur,
  onChange,
  onInstantChange,
  placeholder = "Rechercher...",
  debounceMs = 150,
  className = "",
}: RechercheRapideProps) {
  const [interne, setInterne] = useState(valeur);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // Sync from props
  useEffect(() => {
    setInterne(valeur);
  }, [valeur]);

  const gererChangement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nouv = e.target.value;
    setInterne(nouv);
    if (onInstantChange) onInstantChange(nouv);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onChange(nouv);
    }, debounceMs);
  };

  const effacer = () => {
    setInterne("");
    if (onInstantChange) onInstantChange("");
    onChange("");
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <div className={`relative ${className}`}>
      <IconeRecherche
        taille={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-warm-grey"
      />
      <input
        type="text"
        value={interne}
        onChange={gererChangement}
        placeholder={placeholder}
        className="champ w-full pl-9 pr-10"
      />
      {interne && (
        <button
          type="button"
          onClick={effacer}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-brand-warm-grey hover:bg-brand-light-grey/50 hover:text-brand-black"
          aria-label="Effacer la recherche"
        >
          <IconeFermer taille={14} />
        </button>
      )}
    </div>
  );
}
