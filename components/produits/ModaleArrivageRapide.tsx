"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Scan, 
  Barcode, 
  PackagePlus, 
  Trash2, 
  X, 
  CheckCircle2, 
  Store, 
  Warehouse, 
  Tag, 
  Coins, 
  Plus,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Calculator
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";

interface ModaleArrivageRapideProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces: () => void;
  modeleId?: number | null;
  modeleNom: string;
  categorieId?: number | null;
  prixAchatDefaut?: number;
  prixVenteDefaut?: number | null;
  lots?: { id: number; fournisseur: string; date_entree: string }[];
}

interface LigneExemplaireScan {
  idTemp: string;
  numero_serie: string;
  grade: string;
  emplacement: string;
  prix_achat: number;
  prix_vente_fixe: number | null;
  en_vitrine: boolean;
}

const GRADES_DISPONIBLES = [
  { valeur: "Neuf", label: "Neuf (Scellé)", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300" },
  { valeur: "Grade A+", label: "Grade A+ (Comme neuf)", color: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300" },
  { valeur: "Grade A", label: "Grade A (Excellent état)", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300" },
  { valeur: "Grade B", label: "Grade B (Traces légères)", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300" },
  { valeur: "Grade C", label: "Grade C (Usure prononcée)", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300" },
  { valeur: "A réparer", label: "À réparer", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300" },
  { valeur: "Pour pièces", label: "Pour pièces / HS", color: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-300" },
];

export default function ModaleArrivageRapide({
  ouvert,
  onFermer,
  onSucces,
  modeleId,
  modeleNom,
  categorieId,
  prixAchatDefaut = 0,
  prixVenteDefaut = null,
  lots = [],
}: ModaleArrivageRapideProps) {
  // Paramètres globaux par défaut appliqués aux scans
  const [gradeDefaut, setGradeDefaut] = useState("Grade A");
  const [emplacementDefaut, setEmplacementDefaut] = useState<"reserve" | "vitrine">("reserve");
  
  // Pricing Lot vs Unitaire (Lien mathématique dynamique)
  const [prixAchatUnitaire, setPrixAchatUnitaire] = useState<string>(prixAchatDefaut ? String(prixAchatDefaut) : "");
  const [prixAchatTotalLot, setPrixAchatTotalLot] = useState<string>("");
  const [dernierModePricing, setDernierModePricing] = useState<"unitaire" | "lot">("unitaire");
  
  const [prixVenteGlobal, setPrixVenteGlobal] = useState<string>(prixVenteDefaut ? String(prixVenteDefaut) : "");
  const [lotSelectionne, setLotSelectionne] = useState<string>("");

  // État de la saisie douchette
  const [saisieSn, setSaisieSn] = useState("");
  const [exemplairesScannes, setExemplairesScannes] = useState<LigneExemplaireScan[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const inputSnRef = useRef<HTMLInputElement>(null);

  // Focus automatique sur le champ S/N dès l'ouverture
  useEffect(() => {
    if (ouvert) {
      setSaisieSn("");
      setExemplairesScannes([]);
      setErreur(null);
      setPrixAchatUnitaire(prixAchatDefaut ? String(prixAchatDefaut) : "");
      setPrixAchatTotalLot("");
      setDernierModePricing("unitaire");
      setPrixVenteGlobal(prixVenteDefaut ? String(prixVenteDefaut) : "");
      setTimeout(() => {
        inputSnRef.current?.focus();
      }, 100);
    }
  }, [ouvert, prixAchatDefaut, prixVenteDefaut]);

  // Recalcul dynamique des prix quand le nombre d'exemplaires change
  const recalculerPrixAchat = useCallback((nouveauxExemplaires: LigneExemplaireScan[], mode = dernierModePricing) => {
    const N = nouveauxExemplaires.length;
    if (N === 0) return nouveauxExemplaires;

    if (mode === "lot" && prixAchatTotalLot) {
      const totalNum = Number(prixAchatTotalLot) || 0;
      const unitNum = Math.round(totalNum / N);
      setPrixAchatUnitaire(String(unitNum));
      return nouveauxExemplaires.map((ex) => ({ ...ex, prix_achat: unitNum }));
    } else {
      const unitNum = Number(prixAchatUnitaire) || 0;
      const totalNum = Math.round(unitNum * N);
      setPrixAchatTotalLot(totalNum > 0 ? String(totalNum) : "");
      return nouveauxExemplaires.map((ex) => ({ ...ex, prix_achat: unitNum }));
    }
  }, [dernierModePricing, prixAchatTotalLot, prixAchatUnitaire]);

  // Handler modification manuelle du Prix d'Achat Unitaire
  const gererChangementPrixUnitaire = (val: string) => {
    setPrixAchatUnitaire(val);
    setDernierModePricing("unitaire");
    const unitNum = Number(val) || 0;
    const N = exemplairesScannes.length;
    if (N > 0) {
      setPrixAchatTotalLot(String(Math.round(unitNum * N)));
      setExemplairesScannes((prev) => prev.map((ex) => ({ ...ex, prix_achat: unitNum })));
    }
  };

  // Handler modification manuelle du Prix d'Achat Total du Lot
  const gererChangementPrixTotalLot = (val: string) => {
    setPrixAchatTotalLot(val);
    setDernierModePricing("lot");
    const totalNum = Number(val) || 0;
    const N = exemplairesScannes.length;
    if (N > 0) {
      const unitNum = Math.round(totalNum / N);
      setPrixAchatUnitaire(String(unitNum));
      setExemplairesScannes((prev) => prev.map((ex) => ({ ...ex, prix_achat: unitNum })));
    }
  };

  if (!ouvert) return null;

  // Gestion du scan douchette ou frappe manuelle (Touche Enter)
  const gererScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ajouterScanCourant();
    }
  };

  const ajouterScanCourant = () => {
    const snNettoye = saisieSn.trim().toUpperCase();
    if (!snNettoye) return;

    // Vérifier si le S/N est déjà dans la liste d'attente
    if (exemplairesScannes.some((ex) => ex.numero_serie === snNettoye)) {
      setErreur(`Le numéro de série ${snNettoye} a déjà été scanné dans ce lot.`);
      return;
    }

    setErreur(null);
    const pVenteNum = prixVenteGlobal ? Number(prixVenteGlobal) : null;
    const pAchatNum = Number(prixAchatUnitaire) || 0;

    const nouvelleLigne: LigneExemplaireScan = {
      idTemp: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      numero_serie: snNettoye,
      grade: gradeDefaut,
      emplacement: emplacementDefaut,
      prix_achat: pAchatNum,
      prix_vente_fixe: pVenteNum,
      en_vitrine: emplacementDefaut === "vitrine",
    };

    const listeApresAjout = [nouvelleLigne, ...exemplairesScannes];
    const listeAjustee = recalculerPrixAchat(listeApresAjout);
    setExemplairesScannes(listeAjustee);

    setSaisieSn("");
    inputSnRef.current?.focus();
  };

  // Ajout sans S/N (quantité brute pour accessoires ou petits composants sans S/N)
  const ajouterSansSn = () => {
    const pVenteNum = prixVenteGlobal ? Number(prixVenteGlobal) : null;
    const pAchatNum = Number(prixAchatUnitaire) || 0;

    const nouvelleLigne: LigneExemplaireScan = {
      idTemp: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      numero_serie: `S/N-${Math.floor(100000 + Math.random() * 900000)}`,
      grade: gradeDefaut,
      emplacement: emplacementDefaut,
      prix_achat: pAchatNum,
      prix_vente_fixe: pVenteNum,
      en_vitrine: emplacementDefaut === "vitrine",
    };

    const listeApresAjout = [nouvelleLigne, ...exemplairesScannes];
    const listeAjustee = recalculerPrixAchat(listeApresAjout);
    setExemplairesScannes(listeAjustee);
    inputSnRef.current?.focus();
  };

  const supprimerExemplaire = (idTemp: string) => {
    const listeRestante = exemplairesScannes.filter((ex) => ex.idTemp !== idTemp);
    const listeAjustee = recalculerPrixAchat(listeRestante);
    setExemplairesScannes(listeAjustee);
  };

  const modifierLigne = (idTemp: string, champs: Partial<LigneExemplaireScan>) => {
    setExemplairesScannes((prev) =>
      prev.map((ex) => (ex.idTemp === idTemp ? { ...ex, ...champs } : ex))
    );
  };

  // Validation et enregistrement en base
  const validerArrivage = async () => {
    if (exemplairesScannes.length === 0) {
      setErreur("Veuillez scanner au moins un numéro de série.");
      return;
    }

    setChargement(true);
    setErreur(null);

    try {
      if (modeleId) {
        // Enregistrement par lot via l'endpoint dédié
        for (const ex of exemplairesScannes) {
          const res = await fetch(`/api/modeles/${modeleId}/exemplaires`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quantite: 1,
              prix_achat: ex.prix_achat,
              prix_vente_fixe: ex.prix_vente_fixe,
              grade: ex.grade,
              emplacement: ex.emplacement,
              en_vitrine: ex.en_vitrine,
              numeros_serie: [ex.numero_serie],
              lot_id: lotSelectionne ? Number(lotSelectionne) : null,
              statut: "recu",
            }),
          });

          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson.error || "Erreur lors de l'ajout des exemplaires");
          }
        }
      } else {
        // Création directe de produits si aucun modeleId
        for (const ex of exemplairesScannes) {
          const res = await fetch("/api/produits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: modeleNom,
              categorie: "Matériel",
              categorie_id: categorieId || null,
              numero_serie: ex.numero_serie,
              grade: ex.grade,
              emplacement: ex.emplacement,
              prix_achat: ex.prix_achat,
              prix_vente_fixe: ex.prix_vente_fixe,
              en_vitrine: ex.en_vitrine,
              lot_id: lotSelectionne ? Number(lotSelectionne) : null,
              statut: "recu",
            }),
          });

          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson.error || "Erreur lors de l'ajout du produit");
          }
        }
      }

      onSucces();
      onFermer();
    } catch (err: any) {
      setErreur(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/40 backdrop-blur-sm animate-entree">
      <div className="relative w-full max-w-[95vw] sm:max-w-5xl max-h-[90dvh] flex flex-col bg-white dark:bg-brand-paper rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header de la Modale */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-orange/15 text-brand-orange shrink-0">
              <Scan className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">
                  Réception Scanner-First
                </span>
                <h2 className="text-base sm:text-lg font-black font-outfit text-brand-black dark:text-white">
                  Arrivage Rapide d'Exemplaires
                </h2>
              </div>
              <p className="text-xs text-brand-warm-grey font-medium">
                Modèle commercial cible : <strong className="text-brand-black dark:text-white">{modeleNom}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la Modale */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {erreur && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-900 flex items-center gap-2 animate-entree">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {erreur}
            </div>
          )}

          {/* Section 1 : Paramètres par défaut du lot (Grades, Emplacement, Pricing de lot) */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/3 border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-warm-grey flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-brand-orange" />
                Paramètres par défaut appliqués aux scans
              </span>
              
              {lots.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-brand-warm-grey">Lot d'arrivage :</span>
                  <select
                    value={lotSelectionne}
                    onChange={(e) => setLotSelectionne(e.target.value)}
                    className="select select-sm text-xs font-bold rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10"
                  >
                    <option value="">Indépendant (Sans lot)</option>
                    {lots.map((l) => (
                      <option key={l.id} value={l.id}>
                        Lot #{l.id} - {l.fournisseur}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Sélection rapide du Grade */}
            <div>
              <label className="block text-[11px] font-bold text-brand-warm-grey uppercase mb-1.5">
                Grade cosmétique par défaut :
              </label>
              <div className="flex flex-wrap gap-2">
                {GRADES_DISPONIBLES.map((g) => (
                  <button
                    key={g.valeur}
                    type="button"
                    onClick={() => setGradeDefaut(g.valeur)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                      gradeDefaut === g.valeur
                        ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs scale-102"
                        : "bg-white dark:bg-brand-black/40 text-brand-warm-grey border-slate-200 dark:border-white/10 hover:border-slate-300"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Emplacement + Tarification Liée (Lot vs Unitaire) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              
              {/* Emplacement */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey uppercase mb-1.5">
                  Emplacement
                </label>
                <div className="grid grid-cols-2 gap-1.5 h-11">
                  <button
                    type="button"
                    onClick={() => setEmplacementDefaut("reserve")}
                    className={`rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                      emplacementDefaut === "reserve"
                        ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                        : "bg-white dark:bg-brand-black/40 text-brand-warm-grey border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <Warehouse className="w-3.5 h-3.5" /> Réserve
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmplacementDefaut("vitrine")}
                    className={`rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                      emplacementDefaut === "vitrine"
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-black/40 text-brand-warm-grey border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" /> Vitrine
                  </button>
                </div>
              </div>

              {/* Prix d'Achat Global du Lot (Lien dynamique) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-brand-warm-grey uppercase flex items-center gap-1">
                    <Calculator className="w-3 h-3 text-brand-orange" />
                    Total Lot Achat (DA)
                  </label>
                  {exemplairesScannes.length > 0 && (
                    <span className="text-[10px] font-bold text-brand-orange">
                      ({exemplairesScannes.length} art.)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Coins className="w-4 h-4 text-brand-orange absolute left-3 top-3.5" />
                  <input
                    type="number"
                    min="0"
                    value={prixAchatTotalLot}
                    onChange={(e) => gererChangementPrixTotalLot(e.target.value)}
                    placeholder="Ex: 100000"
                    className="input w-full pl-9 rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs font-bold h-11"
                  />
                </div>
              </div>

              {/* Prix d'Achat Unitaire */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey uppercase mb-1.5">
                  P.A Unitaire (DA)
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-brand-warm-grey absolute left-3 top-3.5" />
                  <input
                    type="number"
                    min="0"
                    value={prixAchatUnitaire}
                    onChange={(e) => gererChangementPrixUnitaire(e.target.value)}
                    placeholder="0"
                    className="input w-full pl-9 rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs font-bold h-11"
                  />
                </div>
              </div>

              {/* Prix de Vente Conseillé */}
              <div>
                <label className="block text-[11px] font-bold text-brand-orange uppercase mb-1.5">
                  P.V Fixe Conseillé (DA)
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-brand-orange absolute left-3 top-3.5" />
                  <input
                    type="number"
                    min="0"
                    value={prixVenteGlobal}
                    onChange={(e) => setPrixVenteGlobal(e.target.value)}
                    placeholder="Optionnel"
                    className="input w-full pl-9 rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs font-bold h-11"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section 2 : Zone de Scan Douchette (Scanner-First - Grande et Tactile) */}
          <div className="p-6 rounded-3xl bg-white dark:bg-brand-black/30 border-2 border-brand-orange/40 shadow-lg shadow-brand-orange/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-brand-orange" />
                Scanner le Numéro de Série Fabricant (S/N)
              </label>
              <span className="text-[11px] font-bold text-brand-warm-grey flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                Touche « Entrée » automatique du scanner
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Scan className="w-7 h-7 text-brand-orange absolute left-4.5 top-4.5 animate-pulse" />
                <input
                  ref={inputSnRef}
                  type="text"
                  value={saisieSn}
                  onChange={(e) => setSaisieSn(e.target.value)}
                  onKeyDown={gererScan}
                  placeholder="Scannez ou tapez le S/N fabricant..."
                  className="input w-full pl-14 pr-32 h-16 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-brand-orange/30 focus:border-brand-orange text-base sm:text-lg font-mono font-black text-brand-black dark:text-white shadow-inner"
                />
                <button
                  type="button"
                  onClick={ajouterScanCourant}
                  disabled={!saisieSn.trim()}
                  className="btn btn-primaire absolute right-2.5 top-2.5 h-11 px-5 rounded-xl font-black text-xs disabled:opacity-30"
                >
                  Ajouter ↵
                </button>
              </div>

              <button
                type="button"
                onClick={ajouterSansSn}
                className="btn btn-secondaire text-xs px-4 h-16 rounded-2xl font-bold flex flex-col items-center justify-center shrink-0 border-slate-200 dark:border-white/10"
                title="Générer un S/N aléatoire pour produit sans code"
              >
                <Plus className="w-4 h-4 mb-0.5 text-brand-orange" />
                <span>Sans S/N</span>
              </button>
            </div>
          </div>

          {/* Section 3 : Liste d'attente visuelle des scans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white">
                  Exemplaires En Attente d'Enregistrement
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange font-black text-xs">
                  {exemplairesScannes.length} unité{exemplairesScannes.length > 1 ? "s" : ""}
                </span>
              </div>

              {exemplairesScannes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExemplairesScannes([])}
                  className="text-xs text-danger font-bold hover:underline"
                >
                  Vider la liste
                </button>
              )}
            </div>

            {exemplairesScannes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 text-brand-warm-grey space-y-2">
                <Barcode className="w-10 h-10 mx-auto opacity-30 text-brand-orange" />
                <p className="text-xs font-bold text-brand-black dark:text-white">
                  Aucun numéro de série scanné pour le moment
                </p>
                <p className="text-[11px]">
                  Placez le curseur dans le champ ci-dessus et scannez à la chaîne les codes-barres avec votre douchette.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-brand-paper">
                <div className="w-full overflow-x-auto max-h-64">
                  <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 z-10">
                      <tr className="text-brand-warm-grey font-black uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3.5">#</th>
                        <th className="py-2.5 px-3.5">Numéro de Série (S/N)</th>
                        <th className="py-2.5 px-3.5">Grade</th>
                        <th className="py-2.5 px-3.5">Emplacement</th>
                        <th className="py-2.5 px-3.5 text-right">P.A (DA)</th>
                        <th className="py-2.5 px-3.5 text-right">P.V (DA)</th>
                        <th className="py-2.5 px-3.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                      {exemplairesScannes.map((ex, index) => (
                        <tr key={ex.idTemp} className="hover:bg-slate-50/80 dark:hover:bg-white/2 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-brand-warm-grey">
                            {exemplairesScannes.length - index}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-black text-brand-black dark:text-white">
                            <span className="bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                              {ex.numero_serie}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <select
                              value={ex.grade}
                              onChange={(e) => modifierLigne(ex.idTemp, { grade: e.target.value })}
                              className="select select-xs rounded-lg bg-slate-50 dark:bg-brand-black border-slate-200 dark:border-white/10 font-bold"
                            >
                              {GRADES_DISPONIBLES.map((g) => (
                                <option key={g.valeur} value={g.valeur}>
                                  {g.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3.5">
                            <button
                              type="button"
                              onClick={() => modifierLigne(ex.idTemp, { 
                                en_vitrine: !ex.en_vitrine, 
                                emplacement: !ex.en_vitrine ? "vitrine" : "reserve" 
                              })}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                                ex.en_vitrine
                                  ? "bg-brand-orange/15 text-brand-orange border-brand-orange/30"
                                  : "bg-slate-100 dark:bg-white/5 text-brand-warm-grey border-slate-200 dark:border-white/10"
                              }`}
                            >
                              {ex.en_vitrine ? <Store className="w-3 h-3" /> : <Warehouse className="w-3 h-3" />}
                              {ex.en_vitrine ? "Vitrine" : "Réserve"}
                            </button>
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold">
                            <input
                              type="number"
                              min="0"
                              value={ex.prix_achat}
                              onChange={(e) => modifierLigne(ex.idTemp, { prix_achat: Number(e.target.value) || 0 })}
                              className="input input-xs w-20 text-right font-bold rounded-lg border-slate-200 dark:border-white/10"
                            />
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-brand-orange">
                            <input
                              type="number"
                              min="0"
                              value={ex.prix_vente_fixe ?? ""}
                              onChange={(e) => modifierLigne(ex.idTemp, { prix_vente_fixe: e.target.value ? Number(e.target.value) : null })}
                              placeholder="—"
                              className="input input-xs w-20 text-right font-bold text-brand-orange rounded-lg border-slate-200 dark:border-white/10"
                            />
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => supprimerExemplaire(ex.idTemp)}
                              className="p-1 rounded-lg text-brand-warm-grey hover:text-danger hover:bg-danger/10 transition-colors"
                              title="Retirer cet exemplaire"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer de la Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/2">
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-secondaire text-xs px-4 py-2.5 rounded-xl font-bold"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={validerArrivage}
            disabled={chargement || exemplairesScannes.length === 0}
            className="btn btn-primaire text-xs px-6 py-2.5 rounded-xl font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
          >
            {chargement ? (
              <span>Enregistrement...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Enregistrer {exemplairesScannes.length} Exemplaire{exemplairesScannes.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
