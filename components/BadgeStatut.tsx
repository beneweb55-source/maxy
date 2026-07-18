import type { StatutProduit } from "@prisma/client";
import { BADGE_A_JETER, INFOS_STATUT } from "@/lib/statuts";

export default function BadgeStatut({
  statut,
  aJeter = false,
}: {
  statut: StatutProduit;
  aJeter?: boolean;
}) {
  const infos = INFOS_STATUT[statut];
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${infos.badge}`}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: statut === "vendu" ? "#FFFFFF" : infos.hex }}
        />
        {infos.libelle}
      </span>
      {statut === "hs" && aJeter && (
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE_A_JETER}`}
          title="Produit HS non récupérable pour pièces"
        >
          À jeter
        </span>
      )}
    </span>
  );
}
