"use client";

import React from "react";
import Link from "next/link";
import BadgeStatut from "@/components/BadgeStatut";
import BoutonImpression from "@/components/BoutonImpression";
import GestionnaireQuantite from "@/components/produits/GestionnaireQuantite";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT } from "@/lib/statuts";
import { IconeBillet, IconeCrayon, IconeCorbeille, IconeVitrine } from "@/components/icons";
import { Plus, Boxes, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { GroupeProduits, ReponseInventaire } from "./types";

interface TableauProduitsProps {
  groupes: GroupeProduits[];
  donneesFiltrees: ReponseInventaire;
  selection: number[];
  groupesOuverts: Set<string>;
  peutModifier: boolean;
  estSocial: boolean;
  onSelection: React.Dispatch<React.SetStateAction<number[]>>;
  onBasculerGroupe: (cle: string) => void;
  onOuvrirAjoutRapide: (source: Record<string, any>) => void;
  onOuvrirEdition: (unites: GroupeProduits["unites"], titre: string, contexte?: GroupeProduits["unites"]) => void;
  onOuvrirVente: (unites: GroupeProduits["unites"]) => void;
  onOuvrirSelectionQuantite: (params: { action: "facturer" | "statut" | "supprimer"; groupe: GroupeProduits }) => void;
  onOuvrirSuppressionModele: (g: GroupeProduits) => void;
  onOuvrirSuppressionUnites: (unites: GroupeProduits["unites"]) => void;
  onBasculerVitrineIds: (ids: number[], enVitrine: boolean, libelle: string) => void;
  onCharger: () => void;
}

export default function TableauProduits({
  groupes,
  donneesFiltrees,
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
  onOuvrirSuppressionModele,
  onOuvrirSuppressionUnites,
  onBasculerVitrineIds,
  onCharger,
}: TableauProduitsProps) {
  return (
    <div className="w-full overflow-x-auto carte !p-0 !hover:transform-none relative scrollbar-fine">
      <table className="w-full min-w-[900px] text-[13px] relative border-collapse">
        <thead className="bg-brand-light-grey/60 dark:bg-black/60 sticky top-0 z-10 backdrop-blur-md border-b border-brand-light-grey dark:border-white/10">
          <tr>
            <th className="py-3.5 px-3 w-10 text-center">
              <input
                type="checkbox"
                checked={donneesFiltrees.produits.length > 0 && donneesFiltrees.produits.every(p => selection.includes(p.id))}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelection(donneesFiltrees.produits.map(p => p.id));
                  } else {
                    onSelection([]);
                  }
                }}
                className="accent-brand-orange w-4 h-4 rounded border-brand-light-grey cursor-pointer"
                title="Tout sélectionner"
              />
            </th>
            <th className="py-3.5 px-2 w-8 text-center"></th>
            <th className="py-3.5 px-3 text-left font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
              Modèle / Référence
            </th>
            <th className="py-3.5 px-3 text-left font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
              Catégorie
            </th>
            <th className="py-3.5 px-3 text-center font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
              Disponibilité / Stock
            </th>
            {!estSocial && (
              <th className="py-3.5 px-3 text-right font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
                Prix Achat Unitaire
              </th>
            )}
            <th className="py-3.5 px-3 text-right font-black text-brand-orange uppercase tracking-wider text-[11px]">
              Prix Vente
            </th>
            <th className="py-3.5 px-4 text-right font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-light-grey/40 dark:divide-white/5">
          {groupes.map((g) => {
            const ouvert = groupesOuverts.has(g.cle);
            const tousCoches = g.unites.length > 0 && g.unites.every(u => selection.includes(u.id));
            const certainsCoches = g.unites.some(u => selection.includes(u.id)) && !tousCoches;

            return (
              <React.Fragment key={g.cle}>
                {/* Ligne Principale du Modèle */}
                <tr className={`group transition-colors min-h-[80px] ${tousCoches || certainsCoches ? "bg-brand-orange/5 dark:bg-brand-orange/10" : "hover:bg-brand-light-grey/20 dark:hover:bg-white/2"}`}>
                  {/* Checkbox Modèle */}
                  <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={tousCoches}
                      ref={(el) => {
                        if (el) el.indeterminate = certainsCoches;
                      }}
                      onChange={() => {
                        const idsGroupe = g.unites.map(u => u.id);
                        if (tousCoches) {
                          onSelection(prev => prev.filter(id => !idsGroupe.includes(id)));
                        } else {
                          onSelection(prev => Array.from(new Set([...prev, ...idsGroupe])));
                        }
                      }}
                      className="accent-brand-orange w-4 h-4 rounded border-brand-light-grey cursor-pointer"
                    />
                  </td>

                  {/* Chevron Drill-Down */}
                  <td className="py-4 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onBasculerGroupe(g.cle)}
                      className="p-1 rounded-lg text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 transition"
                      title={ouvert ? "Masquer les exemplaires" : "Voir les exemplaires physiques (S/N)"}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${ouvert ? "rotate-180 text-brand-orange" : ""}`} />
                    </button>
                  </td>

                  {/* Photo & Référence Modèle */}
                  <td className="py-4 px-3">
                    <div className="flex items-center gap-3">
                      {g.image_url ? (
                        <img
                          src={g.image_url}
                          alt={g.reference}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0 bg-slate-50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                          <Boxes className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div
                          onClick={() => onBasculerGroupe(g.cle)}
                          className="font-black text-sm sm:text-base text-slate-900 dark:text-white hover:text-brand-orange cursor-pointer whitespace-normal break-words max-w-[320px] leading-snug"
                          title={g.reference}
                        >
                          {g.reference}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {g.resumeStatuts.map((r) => (
                            <span key={r.statut} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${INFOS_STATUT[r.statut].badge}`}>
                              {r.n}× {INFOS_STATUT[r.statut].libelle}
                            </span>
                          ))}
                          {g.enVitrine > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-orange/15 text-[10px] font-bold text-brand-orange">
                              <IconeVitrine taille={10} /> Vitrine ({g.enVitrine})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Catégorie */}
                  <td className="py-4 px-3 text-xs font-semibold text-slate-500 whitespace-normal break-words max-w-[160px]">
                    {g.categorie}
                  </td>

                  {/* Saisie Directe Quantité en Stock */}
                  <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <GestionnaireQuantite
                      modeleId={g.modele_id}
                      quantiteActuelle={g.totalDisponibles}
                      unitesIds={g.unites.map((u) => u.id)}
                      peutModifier={peutModifier}
                      onChangement={() => onCharger()}
                      taille="sm"
                    />
                  </td>

                  {/* Prix Achat */}
                  {!estSocial && (
                    <td className="py-4 px-3 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {g.prixMin === g.prixMax
                        ? formaterDA(g.prixMin)
                        : `${formaterDA(g.prixMin)} – ${formaterDA(g.prixMax)}`}
                    </td>
                  )}

                  {/* Prix Vente */}
                  <td className="py-4 px-3 text-right font-mono font-black text-sm text-brand-orange">
                    {g.venteMin === null
                      ? "—"
                      : g.venteMin === g.venteMax
                      ? formaterDA(g.venteMin)
                      : `${formaterDA(g.venteMin)} – ${formaterDA(g.venteMax!)}`}
                  </td>

                  {/* Actions Rapides Modèle */}
                  <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1 justify-end">
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
                          className="p-1.5 rounded-xl text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 transition shadow-2xs font-bold cursor-pointer"
                          title="Ajouter des exemplaires en stock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}

                      {/* Bouton Facturer / Vendre */}
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
                          className="p-1.5 rounded-xl text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 transition shadow-2xs"
                          title="Vendre / Facturer ce modèle"
                        >
                          <IconeBillet taille={16} />
                        </button>
                      )}

                      {/* Bouton Changer Statut */}
                      {peutModifier && (
                        <button
                          type="button"
                          onClick={() => onOuvrirSelectionQuantite({ action: "statut", groupe: g })}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-brand-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                          title="Changer le statut en masse"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                      )}

                      {/* Bouton Vitrine */}
                      {peutModifier && (
                        <button
                          type="button"
                          onClick={() => {
                            const exposeIds = g.unites.filter(u => u.en_vitrine).map(u => u.id);
                            const nonVendu = g.unites.filter(u => u.statut !== "vendu");
                            if (g.enVitrine > 0) {
                              onBasculerVitrineIds(exposeIds, false, g.reference);
                            } else if (nonVendu.length > 0) {
                              onBasculerVitrineIds([nonVendu[0]!.id], true, g.reference);
                            }
                          }}
                          className={`p-1.5 rounded-xl transition ${
                            g.enVitrine > 0
                              ? "text-brand-orange bg-brand-orange/15"
                              : "text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10"
                          }`}
                          title={g.enVitrine > 0 ? "Retirer de la vitrine" : "Mettre en vitrine"}
                        >
                          <IconeVitrine taille={16} />
                        </button>
                      )}

                      {/* Bouton Imprimer */}
                      <BoutonImpression
                        ids={g.unites.map(u => u.id)}
                        dejaImprimee={g.unites.every(u => u.etiquette_imprimee)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                      />

                      {/* Bouton Éditer */}
                      {peutModifier && (
                        <button
                          type="button"
                          onClick={() => onOuvrirEdition(g.unites, g.reference)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                          title="Modifier les informations du modèle"
                        >
                          <IconeCrayon taille={15} />
                        </button>
                      )}

                      {/* Bouton Supprimer */}
                      {peutModifier && (
                        <button
                          type="button"
                          onClick={() => onOuvrirSuppressionModele(g)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          title="Supprimer tous les exemplaires"
                        >
                          <IconeCorbeille taille={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Drill-down : Liste des Exemplaires Physiques Dépliée */}
                {ouvert && (
                  <tr>
                    <td colSpan={8} className="p-0 bg-slate-50/70 dark:bg-zinc-900/60 border-y border-slate-200 dark:border-white/10">
                      <div className="py-3 px-6 space-y-2">
                        <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                          <span>Exemplaires physiques actifs ({g.unites.length})</span>
                          <span>S/N & Emplacement</span>
                        </div>

                        <div className="divide-y divide-slate-200/60 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
                          {g.unites.map((p) => {
                            const estCoche = selection.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                className={`flex items-center justify-between p-3 transition-colors ${
                                  estCoche ? "bg-brand-orange/10" : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={estCoche}
                                    onChange={() => {
                                      onSelection(prev =>
                                        prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                                      );
                                    }}
                                    className="accent-brand-orange w-4 h-4 rounded border-slate-300 cursor-pointer"
                                  />

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Link
                                        href={`/produits/${p.id}`}
                                        className="font-mono text-xs font-black text-brand-orange hover:underline"
                                      >
                                        {p.code_interne}
                                      </Link>
                                      {p.grade && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                                          {p.grade}
                                        </span>
                                      )}
                                      {p.emplacement && (
                                        <span className="text-[10px] font-medium text-slate-400">
                                          · {p.emplacement === "vitrine" ? "Vitrine" : "Réserve"}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                                      {p.numero_serie ? `S/N: ${p.numero_serie}` : "Sans numéro de série"}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />

                                  <div className="text-right">
                                    <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                      {p.prix_vente_fixe ? formaterDA(p.prix_vente_fixe) : "—"}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400">
                                      Achat: {formaterDA(p.prix_achat)}
                                    </div>
                                  </div>

                                  {peutModifier && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => onOuvrirAjoutRapide(p)}
                                        className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition font-bold cursor-pointer"
                                        title="Ajouter des exemplaires en stock"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      {p.statut !== "vendu" && (
                                        <button
                                          type="button"
                                          onClick={() => onOuvrirVente([p])}
                                          className="p-1 rounded-lg text-brand-orange hover:bg-brand-orange/10 transition"
                                          title="Facturer cette unité"
                                        >
                                          <IconeBillet taille={14} />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onOuvrirEdition([p], p.code_interne, g.unites)}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                                        title="Éditer cette unité"
                                      >
                                        <IconeCrayon taille={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onOuvrirSuppressionUnites([p])}
                                        className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition"
                                        title="Supprimer cette unité"
                                      >
                                        <IconeCorbeille taille={13} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
