"use client";

import React, { useCallback, useEffect, useState } from "react";
import { 
  Cpu, 
  HardDrive, 
  Plus, 
  Trash2, 
  Search, 
  Layers, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Boxes,
  ExternalLink,
  Coins
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
  modele?: { nom: string } | null;
}

interface PanneauComposantsProps {
  produitId: number;
  peutModifier: boolean;
  onMiseAJour?: () => void;
}

export default function PanneauComposants({
  produitId,
  peutModifier,
  onMiseAJour,
}: PanneauComposantsProps) {
  const { afficher } = useToast();
  const [composants, setComposants] = useState<ComposantProduit[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Recherche pour ajouter un composant existant depuis le stock
  const [modalAjoutOuvert, setModalAjoutOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [resultatsRecherche, setResultatsRecherche] = useState<any[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [enAction, setEnAction] = useState(false);

  // 1. Charger les composants actuellement attachés
  const chargerComposants = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/produits/${produitId}/composants`);
      if (!res.ok) throw new Error("Erreur lors du chargement des composants.");
      const data = await res.json();
      setComposants(data.composants || []);
    } catch (e: any) {
      setErreur(e?.message || "Impossible de charger la nomenclature.");
    } finally {
      setChargement(false);
    }
  }, [produitId]);

  useEffect(() => {
    void chargerComposants();
  }, [chargerComposants]);

  // 2. Recherche d'articles disponibles en stock
  useEffect(() => {
    if (!modalAjoutOuvert || !recherche.trim()) {
      setResultatsRecherche([]);
      return;
    }

    const timer = setTimeout(async () => {
      setChargementRecherche(true);
      try {
        const params = new URLSearchParams();
        params.set("q", recherche.trim());
        const res = await fetch(`/api/produits?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          // Exclure ce produit lui-même, les vendus, les hors-service et les déjà assemblés
          const dispo = (data.produits || []).filter(
            (p: any) =>
              p.id !== produitId &&
              p.statut !== "vendu" &&
              p.statut !== "hs" &&
              p.statut !== "assemble"
          );
          setResultatsRecherche(dispo);
        }
      } catch {
        // Ignorer les erreurs temporaires de recherche
      } finally {
        setChargementRecherche(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [recherche, modalAjoutOuvert, produitId]);

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

  // 4. Détacher un composant (retourne au stock)
  const detacherComposant = async (composantId: number, nom: string) => {
    if (!window.confirm(`Détacher « ${nom} » ? Le composant sera remis en stock.`)) return;
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

  const totalCoutComposants = composants.reduce((sum, c) => sum + (c.prix_achat || 0), 0);

  return (
    <div className="space-y-4 animate-entree">
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
            <span className="text-sm font-black text-brand-orange font-mono">{formaterDA(totalCoutComposants)}</span>
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

      {/* Liste des composants attachés */}
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
        <div className="divide-y divide-brand-light-grey/40 dark:divide-white/5 rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-white dark:bg-brand-paper overflow-hidden shadow-xs">
          {composants.map((c) => (
            <div
              key={c.id}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-brand-light-grey/20 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/produits/${c.id}`}
                      className="font-mono text-xs font-black text-brand-orange hover:underline"
                    >
                      {c.code_interne}
                    </Link>
                    <span className="font-extrabold text-xs text-brand-black dark:text-white truncate">
                      {c.reference}
                    </span>
                    {c.grade && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                        {c.grade}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-brand-warm-grey mt-0.5">
                    <span>{c.categorie}</span>
                    {c.numero_serie && (
                      <span>· S/N: <strong className="font-mono">{c.numero_serie}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-brand-warm-grey block uppercase font-bold">Prix d'achat</span>
                  <span className="font-mono font-bold text-xs text-brand-black dark:text-white">
                    {formaterDA(c.prix_achat)}
                  </span>
                </div>

                {peutModifier && (
                  <button
                    type="button"
                    onClick={() => detacherComposant(c.id, c.reference)}
                    disabled={enAction}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Détacher du PC et remettre au stock"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'intégration d'un composant existant depuis le stock */}
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
                onClick={() => setModalAjoutOuvert(false)}
                className="text-brand-warm-grey hover:text-brand-black dark:hover:text-white text-sm font-bold"
              >
                Fermer
              </button>
            </div>

            <p className="text-xs text-brand-warm-grey">
              Recherchez une pièce détachée ou composant disponible en stock (RAM, disque dur, alimentation...).
              Une fois rattaché, il sera <strong>automatiquement retiré du stock général</strong>.
            </p>

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

            {!chargementRecherche && recherche.trim() && resultatsRecherche.length === 0 && (
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
                onClick={() => setModalAjoutOuvert(false)}
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
