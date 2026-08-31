"use client";

import React, { useState, useMemo } from "react";
import { 
  Layers, 
  X, 
  CheckCircle2, 
  Hash, 
  ListFilter, 
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Tag,
  Coins,
  PackageCheck
} from "lucide-react";
import type { LigneProduit } from "./CarteProduit";
import type { StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";

interface ModaleSelectionQuantiteProps {
  ouvert: boolean;
  onFermer: () => void;
  action: "facturer" | "statut" | "supprimer";
  titre?: string;
  reference: string;
  categorie: string;
  unites: LigneProduit[];
  onConfirmer: (unitesSelectionnees: LigneProduit[], statutCible?: StatutProduit, note?: string) => void;
}

const STATUTS_DISPONIBLES: { valeur: StatutProduit; libelle: string; color: string }[] = [
  { valeur: "en_vente", libelle: "En Vente", color: "bg-emerald-500 text-white" },
  { valeur: "recu", libelle: "Reçu / En stock", color: "bg-blue-500 text-white" },
  { valeur: "en_test", libelle: "En Test / Diagnostic", color: "bg-purple-500 text-white" },
  { valeur: "a_reparer", libelle: "À Réparer", color: "bg-amber-500 text-white" },
  { valeur: "manque_piece", libelle: "Manque Pièce", color: "bg-rose-500 text-white" },
  { valeur: "hs", libelle: "Hors Service (HS)", color: "bg-red-600 text-white" },
];

export default function ModaleSelectionQuantite({
  ouvert,
  onFermer,
  action,
  titre,
  reference,
  categorie,
  unites,
  onConfirmer,
}: ModaleSelectionQuantiteProps) {
  // Filtre les unités disponibles selon l'action
  const unitesDisponibles = useMemo(() => {
    if (action === "facturer") {
      return unites.filter((u) => u.statut !== "vendu" && u.statut !== "hs");
    }
    if (action === "supprimer") {
      return unites.filter((u) => u.statut !== "vendu");
    }
    return unites;
  }, [unites, action]);

  const [mode, setMode] = useState<"quantite" | "sn">("quantite");
  const [quantiteVoulue, setQuantiteVoulue] = useState<number>(
    Math.min(1, unitesDisponibles.length)
  );
  const [snSelectionnes, setSnSelectionnes] = useState<Set<number>>(
    new Set(unitesDisponibles.slice(0, 1).map((u) => u.id))
  );

  // Pour l'action "statut"
  const [statutCible, setStatutCible] = useState<StatutProduit>("en_vente");
  const [noteStatut, setNoteStatut] = useState("");

  if (!ouvert || unitesDisponibles.length === 0) return null;

  const toggleSelectionSn = (id: number) => {
    setSnSelectionnes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectionnerTousSn = () => {
    if (snSelectionnes.size === unitesDisponibles.length) {
      setSnSelectionnes(new Set());
    } else {
      setSnSelectionnes(new Set(unitesDisponibles.map((u) => u.id)));
    }
  };

  const gererSoumission = () => {
    let selectionFinale: LigneProduit[] = [];
    if (mode === "quantite") {
      const qte = Math.max(1, Math.min(unitesDisponibles.length, quantiteVoulue));
      selectionFinale = unitesDisponibles.slice(0, qte);
    } else {
      selectionFinale = unitesDisponibles.filter((u) => snSelectionnes.has(u.id));
    }

    if (selectionFinale.length === 0) return;

    onConfirmer(
      selectionFinale,
      action === "statut" ? statutCible : undefined,
      noteStatut.trim() || undefined
    );
    onFermer();
  };

  const nbSelectionnes =
    mode === "quantite"
      ? Math.max(1, Math.min(unitesDisponibles.length, quantiteVoulue))
      : snSelectionnes.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/20 backdrop-blur-sm animate-entree">
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-orange/15 text-brand-orange shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black font-outfit text-slate-900 dark:text-white">
                {titre || (action === "facturer" ? "Facturer des Exemplaires" : action === "statut" ? "Modifier le Statut" : "Supprimer des Exemplaires")}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {reference} · <span className="text-brand-orange font-bold">{unitesDisponibles.length} disponible(s)</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper / Onglets : Quantité vs N° de Série */}
        <div className="flex border-b border-slate-100 dark:border-zinc-800 px-4 bg-slate-50/30 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setMode("quantite")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-black border-b-2 transition-all ${
              mode === "quantite"
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Quantité Rapide
          </button>
          <button
            type="button"
            onClick={() => setMode("sn")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-black border-b-2 transition-all ${
              mode === "sn"
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Sélection Précise par S/N
          </button>
        </div>

        {/* Corps du dialogue */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Mode 1 : Quantité Rapide */}
          {mode === "quantite" && (
            <div className="space-y-4 animate-entree">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                Combien d'exemplaires souhaitez-vous traiter ?
              </label>

              <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700">
                <button
                  type="button"
                  onClick={() => setQuantiteVoulue((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-lg font-black text-slate-700 dark:text-white hover:bg-slate-100 active:scale-95 shadow-xs"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={unitesDisponibles.length}
                  value={quantiteVoulue}
                  onChange={(e) => setQuantiteVoulue(Number(e.target.value) || 1)}
                  className="w-24 h-12 text-center text-2xl font-black font-mono rounded-xl bg-white dark:bg-zinc-900 border-2 border-brand-orange text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantiteVoulue((q) => Math.min(unitesDisponibles.length, q + 1))}
                  className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-lg font-black text-slate-700 dark:text-white hover:bg-slate-100 active:scale-95 shadow-xs"
                >
                  +
                </button>
              </div>

              {/* Raccourcis rapides */}
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 5, 10, unitesDisponibles.length].map((nb) => {
                  if (nb > unitesDisponibles.length && nb !== unitesDisponibles.length) return null;
                  return (
                    <button
                      key={nb}
                      type="button"
                      onClick={() => setQuantiteVoulue(nb)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        quantiteVoulue === nb
                          ? "bg-brand-orange text-white"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {nb === unitesDisponibles.length ? `Tout (${nb})` : `${nb} ex.`}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 text-center font-medium">
                Les {quantiteVoulue} premiers exemplaires disponibles de ce modèle seront sélectionnés.
              </p>
            </div>
          )}

          {/* Mode 2 : Sélection Précise par S/N */}
          {mode === "sn" && (
            <div className="space-y-3 animate-entree">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Exemplaires physiques ({snSelectionnes.size} / {unitesDisponibles.length})
                </span>
                <button
                  type="button"
                  onClick={selectionnerTousSn}
                  className="text-xs font-bold text-brand-orange hover:underline"
                >
                  {snSelectionnes.size === unitesDisponibles.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-zinc-900/50">
                {unitesDisponibles.map((u) => {
                  const estCoche = snSelectionnes.has(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectionSn(u.id)}
                      className={`pt-2 first:pt-0 p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        estCoche
                          ? "bg-brand-orange/10 border border-brand-orange/30"
                          : "hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={estCoche}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {u.code_interne}
                            </span>
                            {u.grade && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                                {u.grade}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono font-bold text-brand-orange mt-0.5">
                            {u.numero_serie ? `S/N: ${u.numero_serie}` : "Sans S/N"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <BadgeStatut statut={u.statut} aJeter={u.a_jeter} />
                        {u.prix_vente_fixe && (
                          <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                            {formaterDA(u.prix_vente_fixe)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Supplémentaire pour Action "Statut" */}
          {action === "statut" && (
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400">
                Nouveau Statut Cible
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATUTS_DISPONIBLES.map((st) => (
                  <button
                    key={st.valeur}
                    type="button"
                    onClick={() => setStatutCible(st.valeur)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border text-left transition-all ${
                      statutCible === st.valeur
                        ? "border-brand-orange bg-brand-orange/15 text-brand-orange font-black shadow-xs"
                        : "border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    {st.libelle}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Note d'historique (Optionnel)
                </label>
                <input
                  type="text"
                  value={noteStatut}
                  onChange={(e) => setNoteStatut(e.target.value)}
                  placeholder="Ex: Contrôlé en atelier, prêt à la vente"
                  className="input w-full rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-secondaire text-xs font-bold"
          >
            Annuler
          </button>

          <button
            type="button"
            disabled={nbSelectionnes === 0}
            onClick={gererSoumission}
            className="btn btn-primaire text-xs font-black gap-2 shadow-md disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {action === "facturer"
                ? `Facturer (${nbSelectionnes} exemplaire${nbSelectionnes > 1 ? "s" : ""})`
                : action === "statut"
                ? `Appliquer statut (${nbSelectionnes})`
                : `Supprimer (${nbSelectionnes})`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
