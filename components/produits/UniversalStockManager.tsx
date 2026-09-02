"use client";

import React, { useState, useEffect } from "react";
import { 
  PackagePlus, 
  X, 
  Check, 
  Plus, 
  Minus, 
  Store, 
  Warehouse, 
  Tag, 
  Coins, 
  Scan, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { actionCreateExemplaires } from "@/actions/stock";
import type { StatutProduit } from "@prisma/client";

export interface TargetStockSource {
  modeleId?: number | null;
  produitId?: number | null;
  reference: string;
  categorie?: string;
  categorie_id?: number | null;
  prix_achat?: number;
  prix_vente_fixe?: number | null;
  image_url?: string | null;
  grade?: string | null;
  emplacement?: string | null;
  lot_id?: number | null;
}

interface UniversalStockManagerProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces?: (resultat?: any) => void;
  cible?: TargetStockSource | null;
  modeleId?: number | null;
  modeleNom?: string | null;
  statutDefaut?: StatutProduit;
}

const GRADES_RAPIDES = ["Grade A+", "Grade A", "Grade B", "Neuf", "Pour pièces"];

export default function UniversalStockManager({
  ouvert,
  onFermer,
  onSucces,
  cible,
  modeleId: propModeleId,
  modeleNom: propModeleNom,
  statutDefaut = "en_vente",
}: UniversalStockManagerProps) {
  const { afficher } = useToast();

  const idModeleEffectif = cible?.modeleId ?? propModeleId ?? null;
  const nomReferenceEffectif = cible?.reference ?? propModeleNom ?? "Article";
  const categorieEffectif = cible?.categorie ?? "Matériel";

  // États du formulaire
  const [quantite, setQuantite] = useState<number>(1);
  const [statut, setStatut] = useState<StatutProduit>(statutDefaut);
  const [emplacement, setEmplacement] = useState<"reserve" | "vitrine">(
    cible?.emplacement === "vitrine" ? "vitrine" : "reserve"
  );
  const [grade, setGrade] = useState<string>(cible?.grade || "Grade A");
  const [prixAchat, setPrixAchat] = useState<string>(
    cible?.prix_achat !== undefined && cible.prix_achat !== null ? String(cible.prix_achat) : ""
  );
  const [prixVente, setPrixVente] = useState<string>(
    cible?.prix_vente_fixe !== undefined && cible.prix_vente_fixe !== null ? String(cible.prix_vente_fixe) : ""
  );
  
  // Section S/N optionnelle
  const [afficherSn, setAfficherSn] = useState(false);
  const [snListe, setSnListe] = useState<string[]>([]);
  const [inputSn, setInputSn] = useState("");

  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (ouvert) {
      setQuantite(1);
      setStatut(statutDefaut);
      setEmplacement(cible?.emplacement === "vitrine" ? "vitrine" : "reserve");
      setGrade(cible?.grade || "Grade A");
      setPrixAchat(cible?.prix_achat !== undefined && cible.prix_achat !== null ? String(cible.prix_achat) : "");
      setPrixVente(cible?.prix_vente_fixe !== undefined && cible.prix_vente_fixe !== null ? String(cible.prix_vente_fixe) : "");
      setAfficherSn(false);
      setSnListe([]);
      setInputSn("");
      setErreur(null);
      setEnCours(false);
    }
  }, [ouvert, cible, statutDefaut]);

  if (!ouvert) return null;

  const ajusterQuantite = (delta: number) => {
    setQuantite((prev) => Math.max(1, Math.min(500, prev + delta)));
  };

  const ajouterSnScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputSn.trim()) {
      e.preventDefault();
      const clean = inputSn.trim().toUpperCase();
      if (!snListe.includes(clean)) {
        const nouvelleListe = [...snListe, clean];
        setSnListe(nouvelleListe);
        // Ajuster automatiquement la quantité si plus de S/N sont scannés
        if (nouvelleListe.length > quantite) {
          setQuantite(nouvelleListe.length);
        }
      }
      setInputSn("");
    }
  };

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enCours) return;

    if (!Number.isInteger(quantite) || quantite < 1) {
      setErreur("La quantité doit être au minimum de 1.");
      return;
    }

    setEnCours(true);
    setErreur(null);

    try {
      const res = await actionCreateExemplaires({
        modeleId: idModeleEffectif,
        produitIdSource: cible?.produitId ?? null,
        reference: nomReferenceEffectif,
        categorie: categorieEffectif,
        categorie_id: cible?.categorie_id ?? null,
        quantite: quantite,
        statut: statut,
        prix_achat: prixAchat ? Number(prixAchat) : 0,
        prix_vente_fixe: prixVente ? Number(prixVente) : null,
        emplacement: emplacement,
        grade: grade,
        en_vitrine: emplacement === "vitrine",
        lot_id: cible?.lot_id ?? null,
        image_url: cible?.image_url ?? null,
        numeros_serie: snListe.length > 0 ? snListe : undefined,
      });

      if (!res.succes || !res.donnees) {
        throw new Error(res.erreur || "Erreur lors de la création des exemplaires.");
      }

      afficher(
        res.donnees.message || `${quantite} exemplaire(s) ajouté(s) avec succès.`,
        "succes"
      );

      if (onSucces) onSucces(res.donnees);
      onFermer();
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-entree font-sans">
      <div 
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange shadow-inner">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Ajouter des Exemplaires en Stock
              </h2>
              <p className="text-xs text-brand-warm-grey font-medium truncate max-w-[280px]">
                {nomReferenceEffectif}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFermer}
            disabled={enCours}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={soumettre} className="p-5 overflow-y-auto space-y-5 flex-1">
          {erreur && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erreur}</span>
            </div>
          )}

          {/* ZONE BULK CREATION CENTRALE (Quantité) */}
          <div className="rounded-2xl border-2 border-brand-orange/30 bg-brand-orange/5 dark:bg-brand-orange/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="input-bulk-quantite" className="text-xs font-black uppercase text-brand-orange tracking-wider">
                Nombre d&apos;exemplaires à créer *
              </label>
              <span className="text-[10px] font-bold text-slate-400">
                1 à 500 unités
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => ajusterQuantite(-1)}
                disabled={enCours || quantite <= 1}
                className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 disabled:opacity-40 transition shadow-xs cursor-pointer"
                title="Diminuer (-1)"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                id="input-bulk-quantite"
                type="number"
                min={1}
                max={500}
                value={quantite}
                disabled={enCours}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantite(isNaN(val) ? 1 : Math.max(1, Math.min(500, val)));
                }}
                className="flex-1 h-11 text-center font-mono font-black text-2xl bg-white dark:bg-zinc-800 rounded-xl border border-brand-orange/40 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-orange shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={() => ajusterQuantite(1)}
                disabled={enCours || quantite >= 500}
                className="w-11 h-11 rounded-xl bg-brand-orange text-white flex items-center justify-center hover:bg-brand-orange/90 disabled:opacity-40 transition shadow-xs cursor-pointer font-black"
                title="Augmenter (+1)"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Raccourcis rapides d'ajout en masse */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 5, 10, 20, 50].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setQuantite(step)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    quantite === step
                      ? "bg-brand-orange text-white shadow-2xs"
                      : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 hover:border-brand-orange"
                  }`}
                >
                  +{step}
                </button>
              ))}
            </div>
          </div>

          {/* PARAMÈTRES MÉTIER (Statut & Emplacement) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 block">
                Statut initial
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as StatutProduit)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-brand-orange"
              >
                <option value="en_vente">En vente (Prêt à facturer)</option>
                <option value="recu">Reçu (Arrivage / À tester)</option>
                <option value="ok">Testé OK</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 block">
                Emplacement
              </label>
              <div className="grid grid-cols-2 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 h-10">
                <button
                  type="button"
                  onClick={() => setEmplacement("reserve")}
                  className={`flex items-center justify-center gap-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    emplacement === "reserve"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Warehouse className="w-3 h-3" />
                  Réserve
                </button>
                <button
                  type="button"
                  onClick={() => setEmplacement("vitrine")}
                  className={`flex items-center justify-center gap-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    emplacement === "vitrine"
                      ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Store className="w-3 h-3" />
                  Vitrine
                </button>
              </div>
            </div>
          </div>

          {/* PRIX (Achat & Vente) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 block">
                Prix d&apos;Achat Unitaire (DA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="0"
                  value={prixAchat}
                  onChange={(e) => setPrixAchat(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-brand-orange [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                  DA
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1.5 block">
                Prix de Vente Fixe (DA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Prix conseillé"
                  value={prixVente}
                  onChange={(e) => setPrixVente(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-brand-orange [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                  DA
                </span>
              </div>
            </div>
          </div>

          {/* SECTION OPTIONNELLE : SCAN NUMÉROS DE SÉRIE (ACCORDÉON DISCRET) */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setAfficherSn(!afficherSn)}
              className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-orange transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Scan className="w-3.5 h-3.5 text-slate-400" />
                <span>Scanner des Numéros de Série (Optionnel)</span>
                {snListe.length > 0 && (
                  <span className="text-[10px] bg-brand-orange text-white px-2 py-0.5 rounded-full font-black">
                    {snListe.length} scanné(s)
                  </span>
                )}
              </div>
              {afficherSn ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {afficherSn && (
              <div className="p-3.5 pt-0 space-y-3 border-t border-slate-100 dark:border-zinc-800/50">
                <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                  Scannez ou saisissez les numéros de série à la douchette puis appuyez sur Entrée. Les S/N non saisis pourront être scannés ultérieurement lors de la vente ou du contrôle.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Scanner un S/N et appuyer sur Entrée..."
                    value={inputSn}
                    onChange={(e) => setInputSn(e.target.value)}
                    onKeyDown={ajouterSnScan}
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono font-bold focus:outline-none focus:border-brand-orange"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inputSn.trim()) {
                        ajouterSnScan({ key: "Enter", preventDefault: () => {} } as any);
                      }
                    }}
                    className="px-3 h-9 rounded-xl bg-slate-200 dark:bg-zinc-700 text-xs font-bold hover:bg-slate-300 transition"
                  >
                    Ajouter
                  </button>
                </div>

                {snListe.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {snListe.map((sn, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-mono font-bold"
                      >
                        {sn}
                        <button
                          type="button"
                          onClick={() => setSnListe(snListe.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onFermer}
              disabled={enCours}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={enCours}
              className="btn btn-primaire h-11 px-6 rounded-xl font-bold text-xs shadow-md shadow-brand-orange/20 flex items-center gap-2 cursor-pointer"
            >
              {enCours ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération en cours...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Valider &amp; Créer {quantite} exemplaire{quantite > 1 ? "s" : ""}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
