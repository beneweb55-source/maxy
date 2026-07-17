import type { StatutProduit } from "@prisma/client";
import { INFOS_STATUT } from "@/lib/statuts";

export default function BadgeStatut({ statut }: { statut: StatutProduit }) {
  const infos = INFOS_STATUT[statut];
  return (
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
  );
}
