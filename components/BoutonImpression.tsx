"use client";

import { IconeImprimante } from "@/components/icons";
import { useLangue } from "@/lib/i18n/contexte";

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
  const { t } = useLangue();

  const imprimer = () => {
    if (ids.length === 0) return;
    
    // Ouvre la page d'impression dans une nouvelle fenêtre/onglet
    // Le marquage se fera uniquement via le bouton "Confirmer" sur cette page
    window.open(`/imprimer-etiquettes?ids=${ids.join(",")}`, "_blank", "width=400,height=600");
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        imprimer();
      }}
      className={`inline-flex items-center gap-1.5 transition-colors ${
        dejaImprimee ? "text-succes hover:text-succes/80" : "text-brand-warm-grey hover:text-brand-dark-grey"
      } ${className}`}
      title={dejaImprimee ? t("inventaire.etiquetteImprimee") : t("inventaire.imprimerEtiquetteGenerique")}
    >
      <IconeImprimante taille={16} />
      {texte && <span className="text-sm font-medium">{texte}</span>}
    </button>
  );
}
