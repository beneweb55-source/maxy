"use client";

import { useState } from "react";
import { formaterDA } from "@/lib/caisse";
import { RefreshCw, Eye, Clock, AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";

interface Credit {
  id: number;
  montant_total: number;
  montant_paye: number;
  montant_restant: number;
  statut: string;
  date_vente: string;
  date_echeance: string | null;
  client: { id: number; nom: string; telephone: string | null };
  vente: {
    id: number;
    produit: { code_interne: string; reference: string };
  };
  paiements: any[];
}

const STATUTS = [
  { valeur: "", label: "Tous" },
  { valeur: "impaye", label: "Impayé" },
  { valeur: "partiellement_paye", label: "Partiel" },
  { valeur: "paye", label: "Payé" },
  { valeur: "en_retard", label: "En retard" },
];

function badgeStatut(statut: string) {
  switch (statut) {
    case "paye":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" /> Payé
        </span>
      );
    case "partiellement_paye":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400">
          <MinusCircle className="w-3 h-3" /> Partiel
        </span>
      );
    case "en_retard":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-3 h-3" /> Retard
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-700 dark:text-orange-400">
          <Clock className="w-3 h-3" /> Impayé
        </span>
      );
  }
}

function dateFr(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ListeCredits({
  credits,
  chargement,
  onOuvrir,
  onRafraichir,
}: {
  credits: Credit[];
  chargement: boolean;
  onOuvrir: (id: number) => void;
  onRafraichir: () => void;
}) {
  const [filtreStatut, setFiltreStatut] = useState("");

  const creditsFiltres = filtreStatut
    ? credits.filter((c) => c.statut === filtreStatut)
    : credits;

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUTS.map((s) => (
            <button
              key={s.valeur}
              type="button"
              onClick={() => setFiltreStatut(s.valeur)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                filtreStatut === s.valeur
                  ? "bg-brand-orange text-white border-brand-orange"
                  : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-orange/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRafraichir}
          className="p-2 rounded-xl hover:bg-brand-light-grey/40 transition"
          title="Rafraîchir"
        >
          <RefreshCw className="w-4 h-4 text-brand-warm-grey" />
        </button>
      </div>

      {/* Liste */}
      {chargement ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-brand-paper dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : creditsFiltres.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-brand-light-grey/60 rounded-2xl">
          <p className="text-sm text-brand-warm-grey font-bold">
            {filtreStatut ? "Aucun crédit avec ce statut." : "Aucun crédit enregistré."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {creditsFiltres.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onOuvrir(c.id)}
              className="w-full flex items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl border border-brand-light-grey/50 dark:border-white/10 bg-white dark:bg-brand-paper hover:border-brand-orange/60 hover:bg-brand-orange/5 transition text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-black text-brand-black dark:text-white">
                    {c.client.nom}
                  </span>
                  {c.client.telephone && (
                    <span className="text-[10px] text-brand-warm-grey font-mono">
                      {c.client.telephone}
                    </span>
                  )}
                  {badgeStatut(c.statut)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-brand-warm-grey">
                  <span>Vente #{c.vente.id}</span>
                  <span>{c.vente.produit.reference}</span>
                  <span>{dateFr(c.date_vente)}</span>
                  {c.date_echeance && (
                    <span>Echéance: {dateFr(c.date_echeance)}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 h-1.5 bg-brand-light-grey/40 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-orange rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (c.montant_paye / c.montant_total) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-brand-warm-grey whitespace-nowrap">
                    {c.paiements.length} paie.
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-black text-danger">
                  {formaterDA(c.montant_restant)}
                </p>
                <p className="text-[10px] text-brand-warm-grey">
                  / {formaterDA(c.montant_total)}
                </p>
                <Eye className="w-4 h-4 text-brand-warm-grey mt-1 ml-auto" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
