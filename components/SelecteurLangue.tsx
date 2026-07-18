"use client";

import { useLangue } from "@/lib/i18n/contexte";
import { LANGUES } from "@/lib/i18n/types";

/**
 * Bascule FR / EN de l'interface. `sombre` adapte le style aux fonds foncés
 * (barre latérale, écran de connexion) ; par défaut, style pour fond clair.
 */
export default function SelecteurLangue({ sombre = false }: { sombre?: boolean }) {
  const { langue, definirLangue, t } = useLangue();
  return (
    <div
      role="group"
      aria-label={t("langue.libelle")}
      className={`inline-flex items-center rounded-lg p-0.5 text-xs font-bold ${
        sombre ? "bg-white/10" : "border border-brand-light-grey bg-brand-white"
      }`}
    >
      {LANGUES.map((l) => {
        const actif = langue === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => definirLangue(l)}
            aria-pressed={actif}
            className={`rounded-md px-2 py-1 uppercase tracking-wide transition ${
              actif
                ? "bg-brand-orange text-brand-white"
                : sombre
                  ? "text-brand-grey hover:text-brand-white"
                  : "text-brand-warm-grey hover:text-brand-black"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
