"use client";

import React from "react";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT } from "@/lib/statuts";
import { IconeBillet, IconeCrayon } from "@/components/icons";
import { Plus, Boxes, Hash, Share2 } from "lucide-react";
import type { GroupeProduits } from "./types";

interface GrilleProduitsProps {
  groupes: GroupeProduits[];
  selection: number[];
  groupesOuverts: Set<string>;
  peutModifier: boolean;
  estSocial: boolean;
  onSelection: React.Dispatch<React.SetStateAction<number[]>>;
  onBasculerGroupe: (cle: string) => void;
  onOuvrirAjoutRapide: (source: Record<string, any>) => void;
  onOuvrirEdition: (unites: GroupeProduits["unites"], titre: string) => void;
  onOuvrirVente: (unites: GroupeProduits["unites"]) => void;
  onOuvrirSelectionQuantite: (params: { action: "facturer" | "statut" | "supprimer"; groupe: GroupeProduits }) => void;
  onBasculerSocialIds: (ids: number[], posteReseaux: boolean, libelle: string) => void;
}

export default function GrilleProduits({
  groupes,
  selection,
  groupesOuverts,
  peutModifier,
  estSocial,
  onSelection,
  onBasculerGroupe,
  onOuvrirAjoutRapide,
  onOuvrirEdition,
  onOuvrirVente,
  onOuvrirSelectionQuantite,
  onBasculerSocialIds,
}: GrilleProduitsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {groupes.map((g) => {
        const ouvert = groupesOuverts.has(g.cle);
        const tousCoches = g.unites.length > 0 && g.unites.every(u => selection.includes(u.id));

        return (
          <div
            key={g.cle}
            className={`group flex flex-col carte !p-0 !hover:transform-none overflow-hidden ${
              tousCoches
                ? "!border-brand-orange ring-2 ring-brand-orange/30"
                : "!border-brand-light-grey dark:!border-white/10 hover:!border-brand-orange/40"
            }`}
          >
            {/* Image / Header de la Carte */}
            <div className="relative aspect-video bg-brand-light-grey/30 dark:bg-white/5 overflow-hidden">
              {g.image_url ? (
                <img
                  src={g.image_url}
                  alt={g.reference}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-brand-warm-grey opacity-40">
                  <Boxes className="w-10 h-10" />
                </div>
              )}

              {/* Badges Disponibilité */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-xs shadow-md ${
                  g.totalDisponibles > 0
                    ? "bg-emerald-600 text-white"
                    : "bg-red-600 text-white"
                }`}>
                  En stock : {g.totalDisponibles}
                </span>
              </div>

              {/* Checkbox Sélection Modèle */}
              <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={tousCoches}
                  onChange={() => {
                    const idsGroupe = g.unites.map(u => u.id);
                    if (tousCoches) {
                      onSelection(prev => prev.filter(id => !idsGroupe.includes(id)));
                    } else {
                      onSelection(prev => Array.from(new Set([...prev, ...idsGroupe])));
                    }
                  }}
                  className="accent-brand-orange w-5 h-5 rounded border-2 border-white/80 shadow-sm bg-white/95 dark:bg-white/5 cursor-pointer transition-transform hover:scale-110"
                />
              </div>
            </div>

            {/* Corps de la Carte */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[11px] font-bold text-brand-orange uppercase tracking-wider truncate">
                  {g.categorie}
                </p>
                <h3
                  onClick={() => onBasculerGroupe(g.cle)}
                  className="font-black text-sm text-brand-black dark:text-white line-clamp-2 hover:text-brand-orange cursor-pointer mt-0.5"
                  title={g.reference}
                >
                  {g.reference}
                </h3>

                {/* Statuts */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {g.resumeStatuts.map((r) => (
                    <span key={r.statut} className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${INFOS_STATUT[r.statut].badge}`}>
                      {r.n}× {INFOS_STATUT[r.statut].libelle}
                    </span>
                  ))}
                  {g.nbPostesReseaux > 0 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      <Share2 className="w-3 h-3" />
                      {g.nbPostesReseaux}× Posté
                    </span>
                  )}
                </div>
              </div>

              {/* Prix */}
              <div className="pt-2 border-t border-brand-light-grey/40 dark:border-white/5 flex items-baseline justify-between">
                {!estSocial && (
                  <div>
                    <span className="text-[10px] text-brand-warm-grey font-bold block uppercase">Achat</span>
                    <span className="text-xs font-mono font-bold text-brand-black dark:text-white">
                      {formaterDA(g.prixMin)}
                    </span>
                  </div>
                )}
                <div className="text-right">
                  <span className="text-[10px] text-brand-orange font-bold block uppercase">Vente</span>
                  <span className="text-sm font-mono font-black text-brand-orange">
                    {g.venteMin ? formaterDA(g.venteMin) : "—"}
                  </span>
                </div>
              </div>

              {/* Actions Rapides */}
              <div className="pt-2 border-t border-brand-light-grey/40 dark:border-white/5 flex items-center justify-between gap-1">
                {/* Bouton (+) Arrivage Rapide Universel */}
                {peutModifier && (
                  <button
                    type="button"
                    onClick={() => onOuvrirAjoutRapide({
                      modele_id: g.modele_id,
                      reference: g.reference,
                      categorie: g.categorie,
                      categorie_id: g.categorie_id,
                      prixMin: g.prixMin,
                      venteMin: g.venteMin,
                    })}
                    className="p-2 rounded-xl text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition font-bold cursor-pointer"
                    title="Ajouter des exemplaires en stock"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}

                {/* Bouton Facturer */}
                {g.totalDisponibles > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (g.totalDisponibles === 1) {
                        const disponible = g.unites.find(u => u.statut !== "vendu" && u.statut !== "hs") || g.unites[0]!;
                        onOuvrirVente([disponible]);
                      } else {
                        onOuvrirSelectionQuantite({ action: "facturer", groupe: g });
                      }
                    }}
                    className="p-2 rounded-xl text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 transition"
                    title="Facturer"
                  >
                    <IconeBillet taille={16} />
                  </button>
                )}

                {/* Bouton Drilldown (Voir exemplaires) */}
                <button
                  type="button"
                  onClick={() => onBasculerGroupe(g.cle)}
                  className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    ouvert
                      ? "bg-brand-black text-white dark:bg-white dark:text-brand-black"
                      : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-black dark:text-white hover:bg-brand-light-grey/50"
                  }`}
                  title="Voir les Numéros de Série"
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span>{g.unites.length} S/N</span>
                </button>

                {/* Bouton Éditer */}
                {peutModifier && (
                  <button
                    type="button"
                    onClick={() => onOuvrirEdition(g.unites, g.reference)}
                    className="p-2 rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30 dark:hover:bg-white/5 transition"
                    title="Éditer le modèle"
                  >
                    <IconeCrayon taille={15} />
                  </button>
                )}
              </div>

              {/* Si Déplié dans la carte */}
              {ouvert && (
                <div className="pt-2 border-t border-brand-light-grey/40 dark:border-white/5 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  <span className="text-[10px] font-black uppercase text-brand-warm-grey block">Exemplaires :</span>
                  {g.unites.map((u) => (
                    <div key={u.id} className="p-1.5 rounded-xl bg-brand-paper/50 dark:bg-white/5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-brand-orange">{u.code_interne}</span>
                        <span className="text-[10px] text-brand-warm-grey block">{u.numero_serie ? `S/N: ${u.numero_serie}` : "Sans S/N"}</span>
                      </div>
                      <BadgeStatut statut={u.statut} aJeter={u.a_jeter} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
