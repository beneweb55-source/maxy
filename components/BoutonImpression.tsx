"use client";

import { useState } from "react";
import { IconeImprimante, IconeCocheCercle } from "@/components/icons";

interface BoutonImpressionProps {
  ids: number[];
  dejaImprimee: boolean;
  className?: string;
  texte?: string;
}

export default function BoutonImpression({
  ids,
  dejaImprimee,
  className = "",
  texte,
}: BoutonImpressionProps) {
  const [imprimee, setImprimee] = useState(dejaImprimee);

  const imprimer = () => {
    if (ids.length === 0) return;
    
    // Ouvre la page d'impression dans une nouvelle fenêtre/onglet
    window.open(`/imprimer-etiquettes?ids=${ids.join(",")}`, "_blank", "width=400,height=600");
    
    // Met à jour l'état local pour un feedback immédiat
    setImprimee(true);
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        imprimer();
      }}
      className={`inline-flex items-center gap-1.5 transition-colors ${
        imprimee ? "text-success hover:text-success/80" : "text-brand-warm-grey hover:text-brand-dark-grey"
      } ${className}`}
      title={imprimee ? "Étiquette imprimée" : "Imprimer l'étiquette"}
    >
      {imprimee ? (
        <IconeCocheCercle taille={16} />
      ) : (
        <IconeImprimante taille={16} />
      )}
      {texte && <span className="text-sm font-medium">{texte}</span>}
    </button>
  );
}
