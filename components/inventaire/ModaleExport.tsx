"use client";

import React, { useState, useEffect } from "react";
import { 
  Download, 
  X, 
  CheckSquare, 
  Square, 
  FileSpreadsheet, 
  FileText, 
  SlidersHorizontal, 
  Filter, 
  Layers, 
  Sparkles,
  Check
} from "lucide-react";
import { useToast } from "@/components/toast";

export interface ColonneExport {
  id: string;
  label: string;
  categorie: "identification" | "financier" | "technique" | "logistique";
  defaut: boolean;
}

export const COLONNES_DISPONIBLES: ColonneExport[] = [
  // Identification
  { id: "code_interne", label: "Code Interne (P-XXXX)", categorie: "identification", defaut: true },
  { id: "reference", label: "Désignation / Modèle", categorie: "identification", defaut: true },
  { id: "categorie", label: "Catégorie", categorie: "identification", defaut: true },
  { id: "statut", label: "Statut (En vente, Reçu, etc.)", categorie: "identification", defaut: true },
  { id: "en_vitrine", label: "Exposé en Vitrine", categorie: "identification", defaut: false },

  // Technique
  { id: "numero_serie", label: "Numéro de Série (S/N)", categorie: "technique", defaut: true },
  { id: "grade", label: "Grade / État cosmétique", categorie: "technique", defaut: true },
  { id: "emplacement", label: "Emplacement (Réserve/Vitrine)", categorie: "technique", defaut: true },
  { id: "notes", label: "Notes & Commentaires", categorie: "technique", defaut: false },

  // Financier
  { id: "prix_achat", label: "Prix d'Achat (DA)", categorie: "financier", defaut: true },
  { id: "prix_vente_fixe", label: "Prix de Vente Fixé (DA)", categorie: "financier", defaut: true },
  { id: "marge_estimee", label: "Marge Brute Estimée (DA & %)", categorie: "financier", defaut: false },
  { id: "reparations", label: "Frais de Réparations (DA)", categorie: "financier", defaut: false },
  { id: "prix_vente_reel", label: "Prix Vente Réel (si vendu)", categorie: "financier", defaut: false },
  { id: "date_vente", label: "Date de Vente", categorie: "financier", defaut: false },

  // Logistique
  { id: "lot_id", label: "N° Lot / Arrivage", categorie: "logistique", defaut: true },
  { id: "fournisseur", label: "Fournisseur", categorie: "logistique", defaut: true },
  { id: "date_entree", label: "Date d'Entrée en Stock", categorie: "logistique", defaut: true },
];

interface ModaleExportProps {
  ouverte: boolean;
  onFermer: () => void;
  searchParamsString: string;
  nbArticlesFiltres: number;
}

export default function ModaleExport({
  ouverte,
  onFermer,
  searchParamsString,
  nbArticlesFiltres,
}: ModaleExportProps) {
  const { afficher } = useToast();

  const [colonnesSelectionnees, setColonnesSelectionnees] = useState<string[]>(
    COLONNES_DISPONIBLES.filter((c) => c.defaut).map((c) => c.id)
  );
  const [formatFichier, setFormatFichier] = useState<"csv_excel" | "csv_standard" | "xlsx">("csv_excel");
  const [scopeExport, setScopeExport] = useState<"filtres" | "tous">("filtres");
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);

  useEffect(() => {
    if (ouverte) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [ouverte]);

  if (!ouverte) return null;

  const toggleColonne = (id: string) => {
    setColonnesSelectionnees((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // Presets rapides
  const appliquerPreset = (preset: "pos" | "compta" | "public" | "tout" | "aucun") => {
    switch (preset) {
      case "pos":
        setColonnesSelectionnees([
          "code_interne", "reference", "categorie", "statut", "prix_vente_fixe", "numero_serie", "grade", "emplacement"
        ]);
        break;
      case "compta":
        setColonnesSelectionnees([
          "code_interne", "reference", "lot_id", "fournisseur", "date_entree", "prix_achat", "reparations", "prix_vente_fixe", "marge_estimee"
        ]);
        break;
      case "public":
        setColonnesSelectionnees([
          "reference", "categorie", "prix_vente_fixe", "grade", "numero_serie", "emplacement", "en_vitrine"
        ]);
        break;
      case "tout":
        setColonnesSelectionnees(COLONNES_DISPONIBLES.map((c) => c.id));
        break;
      case "aucun":
        setColonnesSelectionnees([]);
        break;
    }
  };

  const lancerExport = async () => {
    if (colonnesSelectionnees.length === 0) {
      afficher("Veuillez sélectionner au moins une colonne à exporter.", "erreur");
      return;
    }

    setTelechargementEnCours(true);

    try {
      const params = new URLSearchParams(scopeExport === "filtres" ? searchParamsString : "");
      params.set("colonnes", colonnesSelectionnees.join(","));
      params.set("format", formatFichier);
      params.set("scope", scopeExport);

      const url = `/api/produits/export?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Erreur lors de la génération du fichier d'export.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      
      const extension = formatFichier === "xlsx" ? "xlsx" : "csv";
      a.download = `inventaire_${scopeExport === "filtres" ? "filtre" : "complet"}_${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      afficher("Fichier d'inventaire exporté avec succès !", "succes");
      onFermer();
    } catch (err: any) {
      afficher(err.message || "Erreur lors de l'exportation.", "erreur");
    } finally {
      setTelechargementEnCours(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/20 backdrop-blur-sm animate-entree">
      <div className="relative w-11/12 max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-brand-paper rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-orange/15 text-brand-orange">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black font-outfit text-brand-black dark:text-white">
                Exporter l'Inventaire
              </h2>
              <p className="text-xs text-brand-warm-grey font-medium">
                Personnalisez les colonnes, le format et le périmètre d'export
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="p-2 rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 1. Périmètre de l'export */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-brand-orange" />
              1. Périmètre des produits à exporter
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setScopeExport("filtres")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  scopeExport === "filtres"
                    ? "border-brand-orange bg-brand-orange/10 shadow-xs"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-brand-black dark:text-white">
                    Filtres actuels uniquement
                  </div>
                  <div className="text-[11px] text-brand-warm-grey mt-0.5">
                    {nbArticlesFiltres} article{nbArticlesFiltres > 1 ? "s" : ""} affiché{nbArticlesFiltres > 1 ? "s" : ""}
                  </div>
                </div>
                {scopeExport === "filtres" && <Check className="w-4 h-4 text-brand-orange" />}
              </div>

              <div
                onClick={() => setScopeExport("tous")}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  scopeExport === "tous"
                    ? "border-brand-orange bg-brand-orange/10 shadow-xs"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-brand-black dark:text-white">
                    Tout le catalogue (Global)
                  </div>
                  <div className="text-[11px] text-brand-warm-grey mt-0.5">
                    Tous les articles en stock
                  </div>
                </div>
                {scopeExport === "tous" && <Check className="w-4 h-4 text-brand-orange" />}
              </div>
            </div>
          </div>

          {/* 2. Préréglages Rapides (Presets) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                2. Modèles de colonnes prêts à l'emploi
              </label>
              <span className="text-[11px] font-bold text-brand-orange">
                {colonnesSelectionnees.length} / {COLONNES_DISPONIBLES.length} sélectionnée{colonnesSelectionnees.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => appliquerPreset("pos")}
                className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-brand-orange hover:text-brand-orange"
              >
                🎯 Standard POS
              </button>
              <button
                type="button"
                onClick={() => appliquerPreset("compta")}
                className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-brand-orange hover:text-brand-orange"
              >
                💼 Comptabilité & Marge
              </button>
              <button
                type="button"
                onClick={() => appliquerPreset("public")}
                className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-brand-orange hover:text-brand-orange"
              >
                🏷️ Public (Sans prix d'achat)
              </button>
              <button
                type="button"
                onClick={() => appliquerPreset("tout")}
                className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
              >
                ✓ Tout cocher
              </button>
            </div>
          </div>

          {/* 3. Sélection des Colonnes (Checkboxes en Grille) */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {COLONNES_DISPONIBLES.map((col) => {
                const estCoche = colonnesSelectionnees.includes(col.id);
                return (
                  <div
                    key={col.id}
                    onClick={() => toggleColonne(col.id)}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                      estCoche
                        ? "bg-slate-900 text-white dark:bg-white dark:text-brand-black border-slate-900 dark:border-white shadow-xs"
                        : "bg-slate-50/60 dark:bg-white/2 border-slate-200 dark:border-white/10 text-brand-warm-grey hover:border-slate-300"
                    }`}
                  >
                    <div className="shrink-0">
                      {estCoche ? (
                        <CheckSquare className="w-4 h-4 text-brand-orange" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <span className="truncate">{col.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Format du fichier */}
          <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
            <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-brand-orange" />
              3. Format du fichier de sortie
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setFormatFichier("csv_excel")}
                className={`p-3 rounded-xl border cursor-pointer text-xs font-bold flex items-center gap-2 transition-all ${
                  formatFichier === "csv_excel"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 text-brand-warm-grey hover:border-slate-300"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div>
                  <div>CSV Excel (Point-virgule)</div>
                  <div className="text-[10px] font-medium opacity-70">Idéal Excel FR / DZ</div>
                </div>
              </div>

              <div
                onClick={() => setFormatFichier("xlsx")}
                className={`p-3 rounded-xl border cursor-pointer text-xs font-bold flex items-center gap-2 transition-all ${
                  formatFichier === "xlsx"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 text-brand-warm-grey hover:border-slate-300"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <div>
                  <div>Classeur Excel (.xlsx)</div>
                  <div className="text-[10px] font-medium opacity-70">Format natif Microsoft</div>
                </div>
              </div>

              <div
                onClick={() => setFormatFichier("csv_standard")}
                className={`p-3 rounded-xl border cursor-pointer text-xs font-bold flex items-center gap-2 transition-all ${
                  formatFichier === "csv_standard"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 text-brand-warm-grey hover:border-slate-300"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div>
                  <div>CSV Standard (Virgule)</div>
                  <div className="text-[10px] font-medium opacity-70">Compatibilité ERP/US</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/2">
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-secondaire text-xs h-11 px-5 rounded-xl font-bold"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={lancerExport}
            disabled={telechargementEnCours || colonnesSelectionnees.length === 0}
            className="btn btn-primaire text-xs h-11 px-6 rounded-xl font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
          >
            {telechargementEnCours ? (
              <span>Génération du fichier...</span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Télécharger l'Export ({colonnesSelectionnees.length} colonnes)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
