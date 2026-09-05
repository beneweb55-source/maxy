"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [monte, setMonte] = useState(false);

  const boutonRef = useRef<HTMLButtonElement | null>(null);
  const [positionMenu, setPositionMenu] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Modal note/coût pour transition spécifique
  const [modalTransition, setModalTransition] = useState<StatutProduit | null>(null);
  const [noteTransition, setNoteTransition] = useState("");
  const [coutReparation, setCoutReparation] = useState("");

  const regleActuelle = REGLES_MACHINE_ETATS[statutActuel];
  const transitions = transitionsPossibles(statutActuel);

  useEffect(() => {
    setMonte(true);
  }, []);

  // Recalculer la position du menu flottant à l'ouverture et lors du scroll/redimensionnement
  const actualiserPosition = useCallback(() => {
    if (!boutonRef.current) return;
    const rect = boutonRef.current.getBoundingClientRect();
    const menuLargeur = 250;
    const menuHauteur = 240;

    // Déterminer s'il faut ouvrir vers le haut ou vers le bas
    const ouvrirVersHaut = rect.bottom + menuHauteur > window.innerHeight && rect.top > menuHauteur;
    const top = ouvrirVersHaut ? rect.top - menuHauteur - 4 : rect.bottom + 4;

    // Aligner à droite du bouton si possible, sinon borner à l'écran
    let left = rect.right - menuLargeur;
    if (left < 10) left = 10;
    if (left + menuLargeur > window.innerWidth - 10) {
      left = window.innerWidth - menuLargeur - 10;
    }

    setPositionMenu({ top, left });
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    actualiserPosition();

    const gererScrollResize = () => {
      actualiserPosition();
    };

    window.addEventListener("scroll", gererScrollResize, true);
    window.addEventListener("resize", gererScrollResize);
    return () => {
      window.removeEventListener("scroll", gererScrollResize, true);
      window.removeEventListener("resize", gererScrollResize);
    };
  }, [ouvert, actualiserPosition]);

  // Verrouillage du scroll body si modalTransition ouverte
  useEffect(() => {
    if (modalTransition) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [modalTransition]);

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
    if (
      cible === "a_reparer" || 
      cible === "manque_piece" || 
      cible === "hs" || 
      (statutActuel === "a_reparer" && cible === "ok")
    ) {
      setModalTransition(cible);
      setOuvert(false);
      return;
    }

    void executerChangement(cible);
  };

  return (
    <div className="inline-block text-left">
      {/* Bouton Déclencheur du Statut Actuel */}
      <button
        ref={boutonRef}
        type="button"
        disabled={!peutModifier || regleActuelle.estFinal || transitions.length === 0}
        onClick={(e) => {
          e.stopPropagation();
          setOuvert((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1.5 font-black transition-all border border-brand-light-grey rounded-md shadow-2xs ${
          regleActuelle.badge
        } ${
          taille === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
        } ${
          !peutModifier || regleActuelle.estFinal || transitions.length === 0
            ? "cursor-default opacity-90"
            : "hover:opacity-100 cursor-pointer active:scale-95"
        }`}
      >
        <span>{regleActuelle.libelle}</span>
        {peutModifier && !regleActuelle.estFinal && transitions.length > 0 ? (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ouvert ? "rotate-180" : ""}`} />
        ) : (
          regleActuelle.estFinal && <Lock className="w-3 h-3 opacity-60 ml-0.5" />
        )}
      </button>

      {/* Menu Déroulant rendu via React Portal dans document.body pour ne JAMAIS être coupé */}
      {monte && ouvert && transitions.length > 0 && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          {/* Backdrop invisible pour fermer au clic extérieur */}
          <div
            className="fixed inset-0 bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setOuvert(false);
            }}
          />

          {/* Menu Flottant positionné par rapport au bouton */}
          <div 
            style={{ 
              top: `${positionMenu.top}px`, 
              left: `${positionMenu.left}px`,
              width: "250px"
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed rounded-xl border border-brand-light-grey bg-white dark:bg-brand-paper shadow-2xl p-1.5 text-xs animate-entree text-brand-black dark:text-white z-[10000]"
          >
            <div className="px-2.5 py-1.5 border-b border-brand-light-grey dark:border-white/10 mb-1 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-warm-grey block">
                Changer l&apos;État Atelier
              </span>
              <button 
                type="button" 
                onClick={() => setOuvert(false)}
                className="text-brand-warm-grey hover:text-brand-warm-grey dark:hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-fine">
              {transitions.map((cible) => {
                const regleCible = REGLES_MACHINE_ETATS[cible];
                if (!regleCible) return null;

                return (
                  <button
                    key={cible}
                    type="button"
                    disabled={envoi}
                    onClick={() => initierTransition(cible)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-brand-paper dark:hover:bg-white/5 transition-colors text-left font-bold group border border-transparent hover:border-brand-light-grey dark:hover:border-white/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className="w-3.5 h-3.5 text-brand-warm-grey group-hover:text-brand-orange shrink-0" />
                      <div className="min-w-0">
                        <span className="block truncate text-brand-black dark:text-white">{regleCible.libelle}</span>
                        <span className="text-[10px] font-medium text-brand-warm-grey block truncate">
                          {regleCible.description}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-brand-light-grey ${regleCible.badge} shrink-0`}>
                      {regleCible.libelle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal / Dialog de Note ou Coût de Réparation avec Portal et Layout Fixe */}
      {monte && modalTransition && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/20 backdrop-blur-sm animate-entree">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-brand-paper rounded-3xl border border-brand-light-grey dark:border-white/10 shadow-2xl overflow-hidden text-brand-black dark:text-white"
          >
            {/* Header modal */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-brand-light-grey dark:border-white/10 bg-brand-light-grey/30 dark:bg-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-brand-orange/10 text-brand-orange shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-outfit">
                    Passer à « {REGLES_MACHINE_ETATS[modalTransition]?.libelle} »
                  </h3>
                  <span className="text-[11px] text-brand-warm-grey">
                    Traçabilité de l&apos;intervention atelier
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalTransition(null)}
                className="p-1.5 rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps défilable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              {/* Coût de réparation si applicable */}
              {(modalTransition === "ok" || modalTransition === "a_reparer") && (
                <div>
                  <label className="block font-bold text-brand-black dark:text-white mb-1">
                    Coût des pièces ou main d&apos;œuvre (DA) — Optionnel
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={coutReparation}
                    onChange={(e) => setCoutReparation(e.target.value)}
                    placeholder="0 DA"
                    className="champ w-full h-10 px-3 bg-white dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl font-mono font-bold text-xs focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-brand-black dark:text-white mb-1">
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
                  className="champ w-full p-3 bg-white dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl font-medium text-xs focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer d'action toujours accessible en bas */}
            <div className="flex-shrink-0 flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-brand-light-grey dark:border-white/10 bg-brand-light-grey/30 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setModalTransition(null)}
                className="btn btn-secondaire text-xs py-2 px-3.5 rounded-xl font-bold"
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
                className="btn btn-primaire text-xs py-2 px-4 rounded-xl font-black shadow-md"
              >
                {envoi ? "Enregistrement..." : "Confirmer le changement"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
