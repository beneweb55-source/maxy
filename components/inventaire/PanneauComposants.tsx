"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useConfirmation } from "@/hooks/useConfirmation";
import ConfirmerAction from "@/components/ConfirmerAction";
import {
  Cpu,
  HardDrive,
  Plus,
  Trash2,
  Search,
  Layers,
  AlertCircle,
  CheckCircle2,
  Boxes,
  Coins,
  Clock,
  ArrowRightLeft,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";

export interface ComposantProduit {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  numero_serie: string | null;
  grade: string | null;
  statut: string;
  prix_achat: number;
  image_url: string | null;
  modele?: { nom: string; categorie_id?: number } | null;
}

interface HistoriqueOperation {
  id: number;
  action: string;
  note: string | null;
  created_at: string;
  produit: { code_interne: string; reference: string };
  user: { username: string };
}

interface StatsComposants {
  nb_composants: number;
  cout_total: number;
  par_categorie: Record<string, number>;
}

interface PanneauComposantsProps {
  produitId: number;
  peutModifier: boolean;
  onMiseAJour?: () => void;
}

// Icônes par catégorie
const ICONES_CATEGORIE: Record<string, React.ReactNode> = {
  RAM: <Cpu className="w-4 h-4" />,
  SSD: <HardDrive className="w-4 h-4" />,
  "Disque Dur": <HardDrive className="w-4 h-4" />,
  CPU: <Cpu className="w-4 h-4" />,
  GPU: <Cpu className="w-4 h-4" />,
  Alimentation: <Wrench className="w-4 h-4" />,
};

function getIconeCategorie(categorie: string): React.ReactNode {
  const catUpper = categorie.toUpperCase();
  for (const [cle, icone] of Object.entries(ICONES_CATEGORIE)) {
    if (catUpper.includes(cle.toUpperCase())) return icone;
  }
  return <Cpu className="w-4 h-4" />;
}

function getLabelAction(action: string): { label: string; color: string; icon: React.ReactNode } {
  switch (action) {
    case "assemblage":
      return { label: "Assemblé", color: "text-emerald-600 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" /> };
    case "désassemblage":
      return { label: "Désassemblé", color: "text-amber-600 bg-amber-50", icon: <ArrowRightLeft className="w-3 h-3" /> };
    case "remplacement":
      return { label: "Remplacé", color: "text-blue-600 bg-blue-50", icon: <ArrowRightLeft className="w-3 h-3" /> };
    case "vente_composant":
      return { label: "Vendu", color: "text-purple-600 bg-purple-50", icon: <Coins className="w-3 h-3" /> };
    default:
      return { label: action, color: "text-slate-600 bg-slate-50", icon: <Clock className="w-3 h-3" /> };
  }
}

export default function PanneauComposants({
  produitId,
  peutModifier,
  onMiseAJour,
}: PanneauComposantsProps) {
  const { afficher } = useToast();
  const { confirmer, propsModal } = useConfirmation();
  const [composants, setComposants] = useState<ComposantProduit[]>([]);
  const [historique, setHistorique] = useState<HistoriqueOperation[]>([]);
  const [stats, setStats] = useState<StatsComposants | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Modale d'ajout
  const [modalAjoutOuvert, setModalAjoutOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState<string | null>(null);
  const [resultatsRecherche, setResultatsRecherche] = useState<any[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [enAction, setEnAction] = useState(false);

  // 1. Charger les composants + historique + stats
  const chargerComposants = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/produits/${produitId}/composants`);
      if (!res.ok) throw new Error("Erreur lors du chargement des composants.");
      const data = await res.json();
      setComposants(data.composants || []);
      setHistorique(data.historique || []);
      setStats(data.stats || null);
    } catch (e: any) {
      setErreur(e?.message || "Impossible de charger la nomenclature.");
    } finally {
      setChargement(false);
    }
  }, [produitId]);

  useEffect(() => {
    void chargerComposants();
  }, [chargerComposants]);

  // 2. Recherche de composants disponibles (endpoint dédié)
  useEffect(() => {
    if (!modalAjoutOuvert) return;

    const timer = setTimeout(async () => {
      setChargementRecherche(true);
      try {
        const params = new URLSearchParams();
        if (recherche.trim()) params.set("q", recherche.trim());
        if (filtreCategorie) params.set("q", filtreCategorie);
        params.set("limit", "30");
        const res = await fetch(`/api/produits/composants/disponibles?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          // Exclure ce produit lui-même
          const dispo = (data.produits || []).filter((p: any) => p.id !== produitId);
          setResultatsRecherche(dispo);
        }
      } catch {
        // Ignorer les erreurs temporaires
      } finally {
        setChargementRecherche(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [recherche, filtreCategorie, modalAjoutOuvert, produitId]);

  // 3. Attacher un composant
  const attacherComposant = async (composantId: number) => {
    if (enAction) return;
    setEnAction(true);
    try {
      const res = await fetch(`/api/produits/${produitId}/composants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composant_id: composantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'intégration.");

      afficher("Composant intégré au produit assemblé !", "succes");
      setRecherche("");
      setResultatsRecherche([]);
      setModalAjoutOuvert(false);
      await chargerComposants();
      if (onMiseAJour) onMiseAJour();
    } catch (e: any) {
      afficher(e?.message || "Erreur lors de l'intégration.", "erreur");
    } finally {
      setEnAction(false);
    }
  };

  // 4. Détacher un composant
  const detacherComposant = async (composantId: number, nom: string) => {
    const ok = await confirmer({
      titre: "Détacher le composant",
      message: `Détacher « ${nom} » ? Le composant sera remis en stock.`,
      labelConfirmer: "Détacher",
      variante: "warning",
    });
    if (!ok) return;
    if (enAction) return;
    setEnAction(true);
    try {
      const res = await fetch(`/api/produits/${produitId}/composants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composant_id: composantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du retrait.");

      afficher("Composant retiré et remis en stock.", "succes");
      await chargerComposants();
      if (onMiseAJour) onMiseAJour();
    } catch (e: any) {
      afficher(e?.message || "Erreur lors du retrait.", "erreur");
    } finally {
      setEnAction(false);
    }
  };

  // Catégories uniques pour les filtres
  const categoriesUniques = [...new Set(composants.map((c) => c.categorie))].sort();

  return (
    <div className="space-y-4 animate-entree">
      <ConfirmerAction {...propsModal} />
      {/* En-tête de la section Nomenclature */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-brand-light-grey/25 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-orange" />
            <h4 className="text-sm font-black font-outfit text-brand-black dark:text-white uppercase tracking-wider">
              Nomenclature &amp; Composants (BOM)
            </h4>
          </div>
          <p className="text-xs text-brand-warm-grey mt-0.5">
            Composants matériels intégrés dans cet équipement (RAM, disques, cartes...)
          </p>
        </div>

        {peutModifier && (
          <button
            type="button"
            onClick={() => setModalAjoutOuvert(true)}
            className="btn btn-primaire text-xs py-2 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Intégrer un composant
          </button>
        )}
      </div>

      {/* Synthèse financière des composants */}
      {composants.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-brand-glow/20 dark:bg-white/5 border border-brand-orange/20 text-xs">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-brand-warm-grey block">Composants intégrés</span>
            <span className="text-sm font-black text-brand-black dark:text-white">{composants.length} pièce(s)</span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase text-brand-orange block">Coût total composants</span>
            <span className="text-sm font-black text-brand-orange font-mono">{formaterDA(stats?.cout_total || 0)}</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Gestion du stock</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Automatique (Statut: Assemblé)</span>
          </div>
        </div>
      )}

      {/* Message d'erreur */}
      {erreur && (
        <div className="p-3 rounded-xl bg-danger/10 text-danger text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}

      {/* État de chargement */}
      {chargement && (
        <div className="p-8 text-center text-xs text-brand-warm-grey">
          Chargement des composants...
        </div>
      )}

      {/* Liste des composants attachés — Grille par catégorie */}
      {!chargement && composants.length === 0 && (
        <div className="p-8 text-center rounded-2xl border border-dashed border-brand-light-grey/80 dark:border-white/10 text-xs text-brand-warm-grey space-y-2">
          <Boxes className="w-8 h-8 text-brand-warm-grey/50 mx-auto" />
          <p className="font-bold text-brand-black dark:text-white">Aucun composant rattaché.</p>
          <p className="text-[11px]">
            Pour assembler ce produit avec des composants du stock (ex: barrette de RAM, SSD), cliquez sur « Intégrer un composant ».
          </p>
        </div>
      )}

      {!chargement && composants.length > 0 && (
        <>
          {/* Grille de slots par catégorie */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoriesUniques.map((cat) => {
              const composantsCategorie = composants.filter((c) => c.categorie === cat);
              const icone = getIconeCategorie(cat);
              return (
                <div
                  key={cat}
                  className="rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-white dark:bg-brand-paper overflow-hidden shadow-xs"
                >
                  {/* Header catégorie */}
                  <div className="px-3.5 py-2.5 bg-brand-light-grey/20 dark:bg-white/3 border-b border-brand-light-grey/40 dark:border-white/5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                      {icone}
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-brand-warm-grey block">{cat}</span>
                      <span className="text-xs font-black text-brand-black dark:text-white">
                        {composantsCategorie.length} élément{composantsCategorie.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Composants de la catégorie */}
                  <div className="divide-y divide-brand-light-grey/30 dark:divide-white/5">
                    {composantsCategorie.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 flex items-center justify-between gap-2 hover:bg-brand-light-grey/15 dark:hover:bg-white/3 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/produits/${c.id}`}
                              className="font-mono text-[11px] font-black text-brand-orange hover:underline"
                            >
                              {c.code_interne}
                            </Link>
                            <span className="font-extrabold text-[11px] text-brand-black dark:text-white truncate max-w-[120px]">
                              {c.reference}
                            </span>
                            {c.grade && (
                              <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                                {c.grade}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-brand-warm-grey mt-0.5">
                            {c.numero_serie && (
                              <span>S/N: <strong className="font-mono">{c.numero_serie}</strong></span>
                            )}
                            <span className="font-mono font-bold text-brand-black dark:text-white">
                              {formaterDA(c.prix_achat)}
                            </span>
                          </div>
                        </div>

                        {peutModifier && (
                          <button
                            type="button"
                            onClick={() => detacherComposant(c.id, c.reference)}
                            disabled={enAction}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                            title="Retirer du composé et remettre au stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Historique récent */}
          {historique.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-brand-light-grey/15 dark:bg-white/3 border border-brand-light-grey/50 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2.5">
                <Clock className="w-3.5 h-3.5 text-brand-warm-grey" />
                <span className="text-[10px] font-extrabold uppercase text-brand-warm-grey">Dernières opérations</span>
              </div>
              <div className="space-y-1.5">
                {historique.slice(0, 5).map((h) => {
                  const actionInfo = getLabelAction(h.action);
                  return (
                    <div key={h.id} className="flex items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${actionInfo.color}`}>
                        {actionInfo.icon}
                        {actionInfo.label}
                      </span>
                      <span className="text-brand-warm-grey truncate">{h.note || h.produit.reference}</span>
                      <span className="text-brand-warm-grey/60 ml-auto shrink-0">
                        {new Date(h.created_at).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modale d'intégration d'un composant */}
      {modalAjoutOuvert && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 p-6 space-y-4 shadow-2xl animate-entree">
            <div className="flex items-center justify-between border-b border-brand-light-grey/50 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-orange" />
                <h3 className="font-black text-sm uppercase tracking-wider text-brand-black dark:text-white">
                  Intégrer un composant existant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setModalAjoutOuvert(false); setRecherche(""); setFiltreCategorie(null); }}
                className="text-brand-warm-grey hover:text-brand-black dark:hover:text-white text-sm font-bold"
              >
                Fermer
              </button>
            </div>

            <p className="text-xs text-brand-warm-grey">
              Recherchez une pièce détachée ou composant disponible en stock.
              Une fois rattaché, il sera <strong>automatiquement retiré du stock général</strong>.
            </p>

            {/* Filtres par catégorie */}
            {categoriesUniques.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFiltreCategorie(null)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
                    filtreCategorie === null
                      ? "bg-brand-orange text-white border-brand-orange"
                      : "bg-brand-light-grey/30 text-brand-warm-grey border-brand-light-grey/60 hover:border-brand-orange"
                  }`}
                >
                  Tous
                </button>
                {categoriesUniques.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFiltreCategorie(filtreCategorie === cat ? null : cat)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
                      filtreCategorie === cat
                        ? "bg-brand-orange text-white border-brand-orange"
                        : "bg-brand-light-grey/30 text-brand-warm-grey border-brand-light-grey/60 hover:border-brand-orange"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-brand-warm-grey absolute left-3.5 top-3" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher par référence, code interne ou S/N..."
                className="champ pl-10 text-xs"
                autoFocus
              />
            </div>

            {chargementRecherche && (
              <p className="text-xs text-brand-warm-grey text-center py-4">Recherche dans le stock...</p>
            )}

            {!chargementRecherche && !recherche.trim() && !filtreCategorie && (
              <p className="text-xs text-brand-warm-grey text-center py-4 border border-dashed border-brand-light-grey/70 rounded-xl">
                Tapez un nom de composant ou sélectionnez une catégorie.
              </p>
            )}

            {!chargementRecherche && (recherche.trim() || filtreCategorie) && resultatsRecherche.length === 0 && (
              <p className="text-xs text-brand-warm-grey text-center py-4 border border-dashed border-brand-light-grey/70 rounded-xl">
                Aucun article disponible trouvé.
              </p>
            )}

            {resultatsRecherche.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {resultatsRecherche.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/2 flex items-center justify-between gap-2 hover:border-brand-orange transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-orange">{p.code_interne}</span>
                        <span className="font-extrabold text-xs text-brand-black dark:text-white truncate">
                          {p.reference}
                        </span>
                      </div>
                      <div className="text-[11px] text-brand-warm-grey">
                        {p.categorie} {p.numero_serie ? `· S/N: ${p.numero_serie}` : ""} · Achat: {formaterDA(p.prix_achat)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => attacherComposant(p.id)}
                      disabled={enAction}
                      className="btn btn-primaire text-xs py-1.5 px-3 rounded-lg font-bold shrink-0"
                    >
                      Intégrer
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-brand-light-grey/40 dark:border-white/10">
              <button
                type="button"
                onClick={() => { setModalAjoutOuvert(false); setRecherche(""); setFiltreCategorie(null); }}
                className="btn btn-secondaire text-xs py-2 px-4 rounded-xl font-bold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
