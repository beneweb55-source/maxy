"use client";

import { formaterDA } from "@/lib/caisse";

interface TotauxCredits {
  nombre: number;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  nb_impayes: number;
  nb_partiels: number;
  nb_payes: number;
}

export default function DashboardCredits({
  totaux,
  chargement,
}: {
  totaux: TotauxCredits | null;
  chargement: boolean;
}) {
  if (chargement || !totaux) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-brand-paper dark:bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const cartes = [
    {
      label: "Total crédits",
      valeur: totaux.nombre,
      sous: formaterDA(totaux.montant_total),
      couleur: "text-brand-orange",
      fond: "bg-brand-orange/10",
    },
    {
      label: "Total payé",
      valeur: formaterDA(totaux.montant_paye),
      sous: null,
      couleur: "text-green-600",
      fond: "bg-green-500/10",
    },
    {
      label: "Reste à percevoir",
      valeur: formaterDA(totaux.montant_restant),
      sous: `${totaux.nb_impayes + totaux.nb_partiels} crédit(s) en cours`,
      couleur: "text-danger",
      fond: "bg-danger/10",
    },
    {
      label: "Impayés",
      valeur: totaux.nb_impayes,
      sous: `${totaux.nb_partiels} partiel(s) · ${totaux.nb_payes} payé(s)`,
      couleur: "text-red-600",
      fond: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cartes.map((c) => (
        <div
          key={c.label}
          className={`p-4 rounded-2xl ${c.fond} border border-brand-light-grey/40 dark:border-white/10`}
        >
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1">
            {c.label}
          </p>
          <p className={`text-lg font-black ${c.couleur}`}>{c.valeur}</p>
          {c.sous && (
            <p className="text-[10px] text-brand-warm-grey mt-0.5">{c.sous}</p>
          )}
        </div>
      ))}
    </div>
  );
}
