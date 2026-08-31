"use client";

import React, { useState, useRef, useEffect } from "react";
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
  HelpCircle
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
  { valeur: "Neuf", label: "Neuf (Boîte scellée)", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300" },
  { valeur: "Grade A+", label: "Grade A+ (Comme neuf)", color: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300" },
  { valeur: "Grade A", label: "Grade A (Excellent état)", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300" },
  { valeur: "Grade B", label: "Grade B (Traces légères)", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300" },
  { valeur: "Grade C", label: "Grade C (Usure prononcée)", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300" },
  { valeur: "A réparer", label: "À réparer (Défaut mineur)", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300" },
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
  const [prixAchatGlobal, setPrixAchatGlobal] = useState<number>(prixAchatDefaut);
  const [prixVenteGlobal, setPrixVenteGlobal] = useState<number | null>(prixVenteDefaut);
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
      setPrixAchatGlobal(prixAchatDefaut);
      setPrixVenteGlobal(prixVenteDefaut);
      setTimeout(() => {
        inputSnRef.current?.focus();
      }, 100);
    }
  }, [ouvert, prixAchatDefaut, prixVenteDefaut]);

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
    const nouvelleLigne: LigneExemplaireScan = {
      idTemp: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      numero_serie: snNettoye,
      grade: gradeDefaut,
      emplacement: emplacementDefaut,
      prix_achat: prixAchatGlobal,
      prix_vente_fixe: prixVenteGlobal,
      en_vitrine: emplacementDefaut === "vitrine",
    };

    setExemplairesScannes((prev) => [nouvelleLigne, ...prev]);
    setSaisieSn("");
    inputSnRef.current?.focus();
  };

  // Ajout sans S/N (quantité brute pour accessoires ou petits composants sans S/N)
  const ajouterSansSn = () => {
    const nouvelleLigne: LigneExemplaireScan = {
      idTemp: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      numero_serie: `S/N-${Math.floor(100000 + Math.random() * 900000)}`,
      grade: gradeDefaut,
      emplacement: emplacementDefaut,
      prix_achat: prixAchatGlobal,
      prix_vente_fixe: prixVenteGlobal,
      en_vitrine: emplacementDefaut === "vitrine",
    };
    setExemplairesScannes((prev) => [nouvelleLigne, ...prev]);
    inputSnRef.current?.focus();
  };

  const supprimerExemplaire = (idTemp: string) => {
    setExemplairesScannes((prev) => prev.filter((ex) => ex.idTemp !== idTemp));
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
        // Enregistrement via l'endpoint dédié aux exemplaires de modèle
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
              en_vitrine: ex.en_vitrine,
              prix_achat: ex.prix_achat,
              prix_vente_fixe: ex.prix_vente_fixe,
              lot_id: lotSelectionne ? Number(lotSelectionne) : null,
              quantite: 1,
            }),
          });

          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson.error || "Erreur lors de l'ajout des produits");
          }
        }
      }

      onSucces();
      onFermer();
    } catch (err: any) {
      setErreur(err.message || "Erreur lors de l'enregistrement de l'arrivage.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-brand-black/70 backdrop-blur-xs animate-entree">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-brand-paper rounded-3xl border border-brand-light-grey/80 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header de la Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-orange/15 text-brand-orange">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                  Scanner-First POS
                </span>
                <h2 className="text-lg font-black font-outfit text-brand-black dark:text-white">
                  Réception & Arrivage Rapide d'Exemplaires
                </h2>
              </div>
              <p className="text-xs font-semibold text-brand-warm-grey">
                Modèle cible : <span className="text-brand-black dark:text-white font-bold">{modeleNom}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="p-2 rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps de la Modale */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1 : Attributs par défaut du lot */}
          <div className="p-4 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/50 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-brand-warm-grey">
                Paramètres par défaut du lot scanné
              </span>
              <span className="text-[11px] text-brand-warm-grey">
                Ces valeurs s'appliquent automatiquement à chaque scan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Grade par défaut */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">
                  Grade / État cosmétique
                </label>
                <select
                  value={gradeDefaut}
                  onChange={(e) => setGradeDefaut(e.target.value)}
                  className="select w-full rounded-xl bg-white dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                >
                  {GRADES_DISPONIBLES.map((g) => (
                    <option key={g.valeur} value={g.valeur}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Emplacement par défaut */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">
                  Emplacement physique
                </label>
                <div className="grid grid-cols-2 gap-1 bg-white dark:bg-brand-black p-1 rounded-xl border border-brand-light-grey dark:border-white/10 h-10">
                  <button
                    type="button"
                    onClick={() => setEmplacementDefaut("reserve")}
                    className={`flex items-center justify-center gap-1 text-[11px] font-extrabold rounded-lg transition-all ${
                      emplacementDefaut === "reserve"
                        ? "bg-brand-black text-white dark:bg-white dark:text-brand-black shadow-xs"
                        : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                    }`}
                  >
                    <Warehouse className="w-3.5 h-3.5" /> Réserve
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmplacementDefaut("vitrine")}
                    className={`flex items-center justify-center gap-1 text-[11px] font-extrabold rounded-lg transition-all ${
                      emplacementDefaut === "vitrine"
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" /> Vitrine
                  </button>
                </div>
              </div>

              {/* Prix d'Achat Unitaire */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">
                  Prix d'achat unitaire (DA)
                </label>
                <div className="relative">
                  <Coins className="w-4 h-4 text-brand-warm-grey absolute left-3 top-3" />
                  <input
                    type="number"
                    min="0"
                    value={prixAchatGlobal || ""}
                    onChange={(e) => setPrixAchatGlobal(Number(e.target.value))}
                    placeholder="0 DA"
                    className="input w-full pl-9 rounded-xl bg-white dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                  />
                </div>
              </div>

              {/* Prix de Vente Fixe */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">
                  Prix de vente conseillé (DA)
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-brand-orange absolute left-3 top-3" />
                  <input
                    type="number"
                    min="0"
                    value={prixVenteGlobal || ""}
                    onChange={(e) => setPrixVenteGlobal(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Optionnel (DA)"
                    className="input w-full pl-9 rounded-xl bg-white dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                  />
                </div>
              </div>
            </div>

            {/* Arrivage / Lot lié si disponible */}
            {lots.length > 0 && (
              <div className="pt-2 border-t border-brand-light-grey/40 dark:border-white/5 flex items-center gap-3">
                <span className="text-xs font-bold text-brand-warm-grey shrink-0">Arrivage lié :</span>
                <select
                  value={lotSelectionne}
                  onChange={(e) => setLotSelectionne(e.target.value)}
                  className="select select-sm rounded-xl bg-white dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold"
                >
                  <option value="">Sans arrivage spécifique (Stock indépendant)</option>
                  {lots.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lot #{l.id} - {l.fournisseur} ({new Date(l.date_entree).toLocaleDateString("fr-FR")})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 2 : Zone de Scan Douchette Ultra-Rapide */}
          <div className="p-5 rounded-2xl border-2 border-brand-orange bg-brand-glow/15 dark:bg-brand-orange/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-black font-outfit text-brand-black dark:text-white">
                <Barcode className="w-5 h-5 text-brand-orange animate-pulse" />
                Scanner le Numéro de Série (S/N) ou Code-Barres
              </label>
              <span className="text-[11px] font-bold text-brand-orange bg-brand-orange/15 px-2 py-0.5 rounded-full">
                Appuyez sur Entrée ou flashez avec la douchette
              </span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputSnRef}
                  type="text"
                  value={saisieSn}
                  onChange={(e) => setSaisieSn(e.target.value)}
                  onKeyDown={gererScan}
                  placeholder="Flasher S/N (ex: PF3ABCD1, 5CD9280XXX)..."
                  className="input w-full pl-4 pr-12 text-sm font-mono font-bold bg-white dark:bg-brand-paper border-2 border-brand-orange/60 rounded-xl focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20 h-12 shadow-sm uppercase placeholder:normal-case"
                />
                <button
                  type="button"
                  onClick={ajouterScanCourant}
                  disabled={!saisieSn.trim()}
                  className="absolute right-2 top-2 px-3 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-black transition-all hover:bg-orange-600 disabled:opacity-30 h-8 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>

              <button
                type="button"
                onClick={ajouterSansSn}
                className="btn btn-secondaire text-xs font-bold px-4 rounded-xl shrink-0 h-12 flex items-center gap-1.5"
                title="Générer un numéro d'exemplaire automatique si l'article n'a pas de numéro de série fabricant"
              >
                <PackagePlus className="w-4 h-4" /> Sans S/N
              </button>
            </div>

            {erreur && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-900">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {erreur}
              </div>
            )}
          </div>

          {/* Section 3 : Liste d'attente visuelle des scans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-outfit text-brand-black dark:text-white">
                  Exemplaires scannés dans cette session
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-brand-black text-white dark:bg-white dark:text-brand-black">
                  {exemplairesScannes.length} unité{exemplairesScannes.length > 1 ? "s" : ""}
                </span>
              </div>

              {exemplairesScannes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExemplairesScannes([])}
                  className="text-xs font-bold text-danger hover:underline"
                >
                  Vider la liste
                </button>
              )}
            </div>

            {exemplairesScannes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-brand-light-grey dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/2 text-brand-warm-grey space-y-2">
                <Scan className="w-8 h-8 mx-auto opacity-40 text-brand-orange" />
                <p className="text-xs font-semibold">
                  Aucun numéro de série scanné pour le moment.
                </p>
                <p className="text-[11px] opacity-70">
                  Flashez les codes-barres des équipements à la suite pour les ajouter ici.
                </p>
              </div>
            ) : (
              <div className="border border-brand-light-grey/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-brand-light-grey/30 dark:bg-white/5 border-b border-brand-light-grey/60 dark:border-white/10 text-brand-warm-grey font-black uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Numéro de Série (S/N)</th>
                      <th className="py-2.5 px-3">Grade</th>
                      <th className="py-2.5 px-3">Emplacement</th>
                      <th className="py-2.5 px-3 text-right">Prix Achat</th>
                      <th className="py-2.5 px-3 text-right">Prix Vente</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-light-grey/30 dark:divide-white/5 font-medium">
                    {exemplairesScannes.map((ex, index) => {
                      const gradeObj = GRADES_DISPONIBLES.find((g) => g.valeur === ex.grade);
                      return (
                        <tr key={ex.idTemp} className="hover:bg-brand-light-grey/15 dark:hover:bg-white/2 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-warm-grey">
                            {exemplairesScannes.length - index}
                          </td>

                          <td className="py-2.5 px-3 font-mono font-black text-brand-black dark:text-white">
                            <span className="bg-brand-light-grey/40 dark:bg-white/10 px-2 py-0.5 rounded-md border border-brand-light-grey/80 dark:border-white/10">
                              {ex.numero_serie}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <select
                              value={ex.grade}
                              onChange={(e) => modifierLigne(ex.idTemp, { grade: e.target.value })}
                              className={`px-2 py-1 rounded-lg font-bold text-[11px] border ${gradeObj?.color || ""}`}
                            >
                              {GRADES_DISPONIBLES.map((g) => (
                                <option key={g.valeur} value={g.valeur}>
                                  {g.valeur}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => {
                                const nouv = ex.emplacement === "vitrine" ? "reserve" : "vitrine";
                                modifierLigne(ex.idTemp, { emplacement: nouv, en_vitrine: nouv === "vitrine" });
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-extrabold border transition-all ${
                                ex.emplacement === "vitrine"
                                  ? "bg-brand-orange/15 text-brand-orange border-brand-orange/30"
                                  : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey border-brand-light-grey dark:border-white/10"
                              }`}
                            >
                              {ex.emplacement === "vitrine" ? <Store className="w-3 h-3" /> : <Warehouse className="w-3 h-3" />}
                              {ex.emplacement === "vitrine" ? "Vitrine" : "Réserve"}
                            </button>
                          </td>

                          <td className="py-2.5 px-3 text-right font-bold text-brand-black dark:text-white">
                            {formaterDA(ex.prix_achat)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-extrabold text-brand-orange">
                            {ex.prix_vente_fixe !== null ? formaterDA(ex.prix_vente_fixe) : "—"}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => supprimerExemplaire(ex.idTemp)}
                              className="p-1.5 rounded-lg text-brand-warm-grey hover:text-danger hover:bg-danger/10 transition-colors"
                              title="Retirer cet exemplaire"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer d'actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/2">
          <div className="text-xs font-bold text-brand-warm-grey">
            Total à enregistrer : <span className="text-brand-orange font-black text-sm">{exemplairesScannes.length} exemplaire{exemplairesScannes.length > 1 ? "s" : ""}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onFermer}
              disabled={chargement}
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
                <span>Enregistrement en cours...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Valider l'entrée en stock ({exemplairesScannes.length})
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
