"use client";

import type { StatutProduit } from "@prisma/client";
import { BADGE_A_JETER, INFOS_STATUT } from "@/lib/statuts";
import { useT } from "@/lib/i18n/contexte";

export default function BadgeStatut({
  statut,
  aJeter = false,
}: {
  statut: StatutProduit;
  aJeter?: boolean;
}) {
  const t = useT();
  const infos = INFOS_STATUT[statut];
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm border border-current/10 ${infos.badge}`}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_4px_currentColor]"
          style={{ backgroundColor: statut === "vendu" ? "#FFFFFF" : infos.hex }}
        />
        {t(`statuts.${statut}`)}
      </span>
      {statut === "hs" && aJeter && (
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE_A_JETER}`}
          title={t("statuts.aJeterTitre")}
        >
          {t("statuts.a_jeter")}
        </span>
      )}
    </span>
  );
}
