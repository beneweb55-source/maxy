"use client";

import React, { useState } from "react";
import type { StatutProduit } from "@prisma/client";
import { 
  REGLES_MACHINE_ETATS, 
  transitionsPossibles, 
  verifierTransition 
} from "@/lib/state-machine";
import { 
  ChevronDown, 
  Lock, 
  Check, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  X
} from "lucide-react";
import { useToast } from "@/components/toast";

interface SelecteurStatutProduitProps {
  produitId: number;
  statutActuel: StatutProduit;
  peutModifier?: boolean;
  onStatutChange?: (nouveauStatut: StatutProduit) => void;
  taille?: "sm" | "md";
}

export default function SelecteurStatutProduit({
  produitId,
  statutActuel,
  peutModifier = true,
  onStatutChange,
  taille = "md",
}: SelecteurStatutProduitProps) {
  const { afficher } = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  // Modal note/coût pour transition spécifique
  const [modalTransition, setModalTransition] = useState<StatutProduit | null>(null);
  const [noteTransition, setNoteTransition] = useState("");
  const [coutReparation, setCoutReparation] = useState("");

  const regleActuelle = REGLES_MACHINE_ETATS[statutActuel];
  const transitions = transitionsPossibles(statutActuel);

  const executerChangement = async (nouveauStatut: StatutProduit, note?: string, cout?: number) => {
    setEnvoi(true);
    try {
      const res = await fetch(`/api/produits/${produitId}/statut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statut: nouveauStatut,
          note: note || undefined,
          cout_reparation: cout && cout > 0 ? cout : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Erreur lors du changement d'état");
      }

      afficher(
        `Statut mis à jour : ${REGLES_MACHINE_ETATS[nouveauStatut]?.libelle || nouveauStatut}`,
        "succes"
      );
      setOuvert(false);
      setModalTransition(null);
      setNoteTransition("");
      setCoutReparation("");
      if (onStatutChange) onStatutChange(nouveauStatut);
    } catch (err: any) {
      afficher(err.message || "Impossible de modifier le statut", "erreur");
    } finally {
      setEnvoi(false);
    }
  };

  const initierTransition = (cible: StatutProduit) => {
    // Si la transition cible nécessite une note obligatoire ou un coût potentiel
    if (cible === "a_reparer" || cible === "manque_piece" || cible === "hs" || (statutActuel === "a_reparer" && cible === "ok")) {
      setModalTransition(cible);
      setOuvert(false);
      return;
    }

    void executerChangement(cible);
  };

  return (
    <div className="relative inline-block text-left">
      {/* Bouton du Statut Actuel */}
      <button
        type="button"
        disabled={!peutModifier || regleActuelle.estFinal || transitions.length === 0}
        onClick={() => setOuvert(!ouvert)}
        className={`inline-flex items-center gap-1.5 font-black transition-all border border-slate-300 rounded-md shadow-2xs ${
          regleActuelle.badge
        } ${
          taille === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        } ${
          !peutModifier || regleActuelle.estFinal || transitions.length === 0
            ? "cursor-default opacity-90"
            : "hover:opacity-100 cursor-pointer"
        }`}
      >
        <span>{regleActuelle.libelle}</span>
        {peutModifier && !regleActuelle.estFinal && transitions.length > 0 ? (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`} />
        ) : (
          regleActuelle.estFinal && <Lock className="w-3 h-3 opacity-60 ml-0.5" />
        )}
      </button>

      {/* Menu Déroulant des Transitions Autorisées */}
      {ouvert && transitions.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOuvert(false)}
          />
          <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-slate-300 bg-white shadow-xl z-40 p-1.5 text-xs animate-entree text-slate-800">
            <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Transitions Atelier Autorisées
              </span>
            </div>

            <div className="space-y-1">
              {transitions.map((cible) => {
                const regleCible = REGLES_MACHINE_ETATS[cible];
                if (!regleCible) return null;

                return (
                  <button
                    key={cible}
                    type="button"
                    disabled={envoi}
                    onClick={() => initierTransition(cible)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left font-bold group border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-orange shrink-0" />
                      <div className="min-w-0">
                        <span className="block truncate">{regleCible.libelle}</span>
                        <span className="text-[10px] font-medium text-slate-400 block truncate">
                          {regleCible.description}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-slate-300 ${regleCible.badge} shrink-0`}>
                      {regleCible.libelle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal / Dialog de Note ou Coût de Réparation */}
      {modalTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-entree">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-300 shadow-2xl p-5 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-brand-orange/10 text-brand-orange">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-outfit">
                    Passer à « {REGLES_MACHINE_ETATS[modalTransition]?.libelle} »
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Traçabilité de l&apos;intervention atelier
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTransition(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Coût de réparation si applicable (ex: transition a_reparer -> ok) */}
              {(modalTransition === "ok" || modalTransition === "a_reparer") && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Coût des pièces ou main d&apos;œuvre (DA) — Optionnel
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={coutReparation}
                    onChange={(e) => setCoutReparation(e.target.value)}
                    placeholder="0 DA"
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md font-mono font-bold text-xs focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Note d&apos;intervention / Justification {modalTransition === "hs" || modalTransition === "a_reparer" || modalTransition === "manque_piece" ? "*" : ""}
                </label>
                <textarea
                  rows={3}
                  required={modalTransition === "hs" || modalTransition === "a_reparer" || modalTransition === "manque_piece"}
                  value={noteTransition}
                  onChange={(e) => setNoteTransition(e.target.value)}
                  placeholder={
                    modalTransition === "a_reparer"
                      ? "Décrivez le défaut à réparer..."
                      : modalTransition === "manque_piece"
                      ? "Précisez la pièce manquante à commander..."
                      : modalTransition === "hs"
                      ? "Raison de mise au rebut / appareil irrécupérable..."
                      : "Détails de l'intervention terminée..."
                  }
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-md font-medium text-xs focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalTransition(null)}
                className="btn btn-secondaire text-xs py-2 px-3.5 rounded-md font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  envoi ||
                  ((modalTransition === "hs" || modalTransition === "a_reparer" || modalTransition === "manque_piece") && !noteTransition.trim())
                }
                onClick={() =>
                  void executerChangement(
                    modalTransition,
                    noteTransition.trim(),
                    coutReparation ? Number(coutReparation) : undefined
                  )
                }
                className="btn btn-primaire text-xs py-2 px-4 rounded-md font-black"
              >
                {envoi ? "Enregistrement..." : "Confirmer le changement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
