"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  SlidersHorizontal, 
  Search, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  PackagePlus, 
  Check, 
  Coins, 
  Tag, 
  HelpCircle,
  FolderTree,
  ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { autoClassifyProduct, type ClassificationImportResult } from "@/lib/auto-classify-import";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";

interface AssistantImportationProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces: (stats: any) => void;
  lots?: { id: number; libelle?: string; fournisseur?: string; date_entree?: string }[];
}

interface ColonneMapping {
  cleCible: "reference" | "prix_achat" | "prix_vente_fixe" | "quantite" | "numero_serie" | "grade" | "emplacement" | "categorie_brute" | "ignore";
  label: string;
  obligatoire?: boolean;
}

const COLONNES_CIBLES: ColonneMapping[] = [
  { cleCible: "reference", label: "Désignation / Nom du Modèle *", obligatoire: true },
  { cleCible: "prix_achat", label: "Prix d'Achat Unitaire (DA)" },
  { cleCible: "prix_vente_fixe", label: "Prix de Vente Conseillé (DA)" },
  { cleCible: "quantite", label: "Quantité / Stock" },
  { cleCible: "numero_serie", label: "Numéro de Série (S/N)" },
  { cleCible: "grade", label: "Grade / État Cosmétique" },
  { cleCible: "emplacement", label: "Emplacement (Réserve/Vitrine)" },
  { cleCible: "categorie_brute", label: "Catégorie Fournisseur (Texte)" },
];

interface LignePrevisualisation {
  id: string;
  raw: Record<string, any>;
  reference: string;
  prix_achat: number;
  prix_vente_fixe: number | null;
  quantite: number;
  numero_serie: string | null;
  grade: string;
  emplacement: string;
  classification: ClassificationImportResult;
  categorie_id_selectionnee?: number;
  categorie_nom_selectionnee?: string;
  chemin_selectionne?: string;
}

export default function AssistantImportation({
  ouvert,
  onFermer,
  onSucces,
  lots = [],
}: AssistantImportationProps) {
  const { afficher } = useToast();
  const [etape, setEtape] = useState<1 | 2 | 3>(1);

  // Étape 1 : Fichier & Données brutes
  const [fichierNom, setFichierNom] = useState<string>("");
  const [fichierTaille, setFichierTaille] = useState<number>(0);
  const [enTetesFichier, setEnTetesFichier] = useState<string[]>([]);
  const [lignesBrutes, setLignesBrutes] = useState<Record<string, any>[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsingLoading, setParsingLoading] = useState(false);

  // Étape 2 : Mapping
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Étape 3 : Catégories DB & Prévisualisation
  const [categoriesArbre, setCategoriesArbre] = useState<any[]>([]);
  const [lignesPrevisu, setLignesPrevisu] = useState<LignePrevisualisation[]>([]);
  const [lotGlobalId, setLotGlobalId] = useState<string>("");
  const [filtreDoute, setFiltreDoute] = useState<"tous" | "doutes" | "valides">("tous");
  const [recherchePrevisu, setRecherchePrevisu] = useState("");
  const [pageCourante, setPageCourante] = useState(1);
  const [lignesParPage, setLignesParPage] = useState(25);
  const [envoiImport, setEnvoiImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger l'arborescence des catégories
  useEffect(() => {
    if (ouvert) {
      fetch("/api/categories?tree=1")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCategoriesArbre(data);
        })
        .catch((err) => console.error("Erreur chargement catégories:", err));
    }
  }, [ouvert]);

  // Reset à l'ouverture
  useEffect(() => {
    if (ouvert) {
      setEtape(1);
      setFichierNom("");
      setFichierTaille(0);
      setEnTetesFichier([]);
      setLignesBrutes([]);
      setMapping({});
      setLignesPrevisu([]);
      setPageCourante(1);
    }
  }, [ouvert]);

  if (!ouvert) return null;

  // Lecture du fichier (CSV ou XLSX)
  const traiterFichier = async (file: File) => {
    setParsingLoading(true);
    setFichierNom(file.name);
    setFichierTaille(file.size);

    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "csv" || ext === "txt") {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = (results.data as Record<string, any>[]).filter((row) =>
              Object.values(row).some((v) => v !== null && String(v).trim() !== "")
            );
            const headers = results.meta.fields || (data[0] ? Object.keys(data[0]) : []);
            appliquerDonneesParsees(headers, data);
          },
          error: (error) => {
            afficher(`Erreur de lecture CSV : ${error.message}`, "erreur");
            setParsingLoading(false);
          },
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName || !workbook.Sheets[sheetName]) {
          throw new Error("Le classeur Excel est vide ou ne contient aucune feuille.");
        }
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
        const headers = data.length > 0 ? Object.keys(data[0] || {}) : [];
        appliquerDonneesParsees(headers, data);
      } else {
        afficher("Format non supporté. Veuillez importer un fichier .xlsx ou .csv", "erreur");
        setParsingLoading(false);
      }
    } catch (err: any) {
      afficher(`Erreur lors de l'analyse du fichier : ${err.message}`, "erreur");
      setParsingLoading(false);
    }
  };

  const appliquerDonneesParsees = (headers: string[], data: Record<string, any>[]) => {
    setEnTetesFichier(headers);
    setLignesBrutes(data);

    // Auto-détection du mapping
    const nouveauMapping: Record<string, string> = {};
    for (const h of headers) {
      const hNorm = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      if (["designation", "modele", "produit", "article", "libelle", "reference", "nom", "item", "description"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.reference) nouveauMapping.reference = h;
      } else if (["prix achat", "p.u", "achat", "pu achat", "cout", "prix d'achat", "pa", "cost"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.prix_achat) nouveauMapping.prix_achat = h;
      } else if (["prix vente", "pv", "prix de vente", "prix", "pu vente", "price"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.prix_vente_fixe) nouveauMapping.prix_vente_fixe = h;
      } else if (["qte", "quantite", "qty", "stock", "nombre", "qte stock"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.quantite) nouveauMapping.quantite = h;
      } else if (["s/n", "sn", "serial", "numero de serie", "num serie", "serie", "n° serie"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.numero_serie) nouveauMapping.numero_serie = h;
      } else if (["grade", "etat", "condition", "statut physique"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.grade) nouveauMapping.grade = h;
      } else if (["emplacement", "lieu", "depot", "vitrine"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.emplacement) nouveauMapping.emplacement = h;
      } else if (["categorie", "famille", "cat", "rubrique"].some((k) => hNorm.includes(k))) {
        if (!nouveauMapping.categorie_brute) nouveauMapping.categorie_brute = h;
      }
    }

    setMapping(nouveauMapping);
    setParsingLoading(false);
    setEtape(2);
  };

  // Liste plate des catégories DB pour assignation
  const categoriesPlates = useMemo(() => {
    const list: { id: number; nom: string; chemin: string }[] = [];
    for (const fam of categoriesArbre) {
      list.push({ id: fam.id, nom: fam.nom, chemin: fam.nom });
      for (const cat of fam.enfants || []) {
        list.push({ id: cat.id, nom: cat.nom, chemin: `${fam.nom} › ${cat.nom}` });
        for (const sub of cat.enfants || []) {
          list.push({ id: sub.id, nom: sub.nom, chemin: `${fam.nom} › ${cat.nom} › ${sub.nom}` });
        }
      }
    }
    return list;
  }, [categoriesArbre]);

  // Passage à l'Étape 3 : Génération de la Prévisualisation avec Classification Automatique
  const genererPrevisualisation = () => {
    if (!mapping.reference) {
      afficher("Veuillez sélectionner au moins la colonne correspondant au nom du modèle / désignation.", "erreur");
      return;
    }

    const colRef = mapping.reference;
    const colPrixAchat = mapping.prix_achat;
    const colPrixVente = mapping.prix_vente_fixe;
    const colQte = mapping.quantite;
    const colSn = mapping.numero_serie;
    const colGrade = mapping.grade;
    const colEmplacement = mapping.emplacement;

    const lignes: LignePrevisualisation[] = lignesBrutes.map((row, idx) => {
      const ref = String((colRef ? row[colRef] : "") || "").trim();
      const pAchat = Number(String((colPrixAchat ? row[colPrixAchat] : 0) || 0).replace(/[^0-9.]/g, "")) || 0;
      const pVenteRaw = colPrixVente ? row[colPrixVente] : undefined;
      const pVente = pVenteRaw !== undefined && pVenteRaw !== "" ? Number(String(pVenteRaw).replace(/[^0-9.]/g, "")) : null;
      const qte = Math.max(1, Number(String((colQte ? row[colQte] : 1) || 1).replace(/[^0-9]/g, "")) || 1);
      const sn = colSn && row[colSn] ? String(row[colSn]).trim() : null;
      const grade = colGrade && row[colGrade] ? String(row[colGrade]).trim() : "Grade A";
      const emplacement = colEmplacement && String(row[colEmplacement]).toLowerCase().includes("vitrine") ? "vitrine" : "reserve";

      // Classification Automatique par Algorithme
      const classification = autoClassifyProduct(ref);

      // Trouver l'ID de catégorie correspondant le plus fidèlement
      let catCorrespondante = categoriesPlates.find((c) =>
        classification.sousCategorieNom
          ? c.nom.toLowerCase() === classification.sousCategorieNom.toLowerCase()
          : c.nom.toLowerCase() === classification.categorieNom.toLowerCase()
      );

      if (!catCorrespondante) {
        catCorrespondante = categoriesPlates.find((c) =>
          c.nom.toLowerCase().includes(classification.categorieNom.toLowerCase())
        );
      }

      return {
        id: `previsu_${idx}`,
        raw: row,
        reference: ref,
        prix_achat: pAchat,
        prix_vente_fixe: pVente,
        quantite: qte,
        numero_serie: sn,
        grade,
        emplacement,
        classification,
        categorie_id_selectionnee: catCorrespondante?.id || categoriesPlates[0]?.id || 1,
        categorie_nom_selectionnee: catCorrespondante?.nom || classification.categorieNom,
        chemin_selectionne: catCorrespondante?.chemin || classification.cheminComplet,
      };
    });

    setLignesPrevisu(lignes);
    setEtape(3);
  };

  // Modifier la catégorie d'une ligne de prévisualisation
  const changerCategorieLigne = (id: string, categorieId: number) => {
    const targetCat = categoriesPlates.find((c) => c.id === categorieId);
    if (!targetCat) return;

    setLignesPrevisu((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              categorie_id_selectionnee: targetCat.id,
              categorie_nom_selectionnee: targetCat.nom,
              chemin_selectionne: targetCat.chemin,
              classification: { ...l.classification, doute: false, scoreConfiance: "haut" },
            }
          : l
      )
    );
  };

  // Filtrage et Pagination
  const lignesFiltrees = useMemo(() => {
    return lignesPrevisu.filter((l) => {
      if (filtreDoute === "doutes" && !l.classification.doute) return false;
      if (filtreDoute === "valides" && l.classification.doute) return false;
      if (recherchePrevisu.trim()) {
        const qLower = recherchePrevisu.toLowerCase();
        return (
          l.reference.toLowerCase().includes(qLower) ||
          l.chemin_selectionne?.toLowerCase().includes(qLower) ||
          (l.numero_serie && l.numero_serie.toLowerCase().includes(qLower))
        );
      }
      return true;
    });
  }, [lignesPrevisu, filtreDoute, recherchePrevisu]);

  const totalPages = Math.ceil(lignesFiltrees.length / lignesParPage) || 1;
  const lignesAffichees = lignesFiltrees.slice((pageCourante - 1) * lignesParPage, pageCourante * lignesParPage);

  // Statistiques de classification
  const statsClassification = useMemo(() => {
    const total = lignesPrevisu.length;
    const doutes = lignesPrevisu.filter((l) => l.classification.doute).length;
    const valides = total - doutes;
    const totalUnites = lignesPrevisu.reduce((acc, l) => acc + l.quantite, 0);
    return { total, doutes, valides, totalUnites };
  }, [lignesPrevisu]);

  // Validation Finale & Insertion en Base
  const executerImport = async () => {
    if (lignesPrevisu.length === 0) return;

    setEnvoiImport(true);

    const payloadLignes = lignesPrevisu.map((l) => ({
      reference: l.reference,
      categorie_id: l.categorie_id_selectionnee,
      categorie_nom: l.categorie_nom_selectionnee,
      prix_achat: l.prix_achat,
      prix_vente_fixe: l.prix_vente_fixe,
      quantite: l.quantite,
      numero_serie: l.numero_serie,
      grade: l.grade,
      emplacement: l.emplacement,
      lot_id: lotGlobalId ? Number(lotGlobalId) : null,
      attributs: l.classification.attributsExtraits,
    }));

    try {
      const res = await fetch("/api/produits/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lignes: payloadLignes }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erreur lors de l'importation");
      }

      const resultat = await res.json();
      afficher(`Importation réussie : ${resultat.resume.totalExemplairesCrees} unités enregistrées.`, "succes");
      onSucces(resultat.resume);
      onFermer();
    } catch (err: any) {
      afficher(err.message || "Erreur lors de l'importation.", "erreur");
    } finally {
      setEnvoiImport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-brand-black/75 backdrop-blur-xs animate-entree">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col bg-white dark:bg-brand-paper rounded-3xl border border-brand-light-grey/80 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header de l'Assistant */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-orange/15 text-brand-orange">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                  Assistant Intelligent (Wizard)
                </span>
                <h2 className="text-lg font-black font-outfit text-brand-black dark:text-white">
                  Importation Massive de Produits & Modèles
                </h2>
              </div>
              <p className="text-xs text-brand-warm-grey">
                Supporte fichiers Excel (.xlsx) et CSV avec classification automatique par IA/Regex
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

        {/* Stepper Indicator */}
        <div className="flex border-b border-brand-light-grey/60 dark:border-white/10 px-6 bg-brand-light-grey/5 dark:bg-white/1 overflow-x-auto">
          
          <div className={`flex items-center gap-2.5 py-3 px-4 text-xs font-black border-b-2 transition-all shrink-0 ${
            etape === 1 ? "border-brand-orange text-brand-orange" : etape > 1 ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-brand-warm-grey"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              etape > 1 ? "bg-emerald-500 text-white" : "bg-current/10"
            }`}>
              {etape > 1 ? <Check className="w-3 h-3" /> : 1}
            </span>
            Étape 1 : Fichier (Dropzone)
          </div>

          <div className={`flex items-center gap-2.5 py-3 px-4 text-xs font-black border-b-2 transition-all shrink-0 ${
            etape === 2 ? "border-brand-orange text-brand-orange" : etape > 2 ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-brand-warm-grey"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              etape > 2 ? "bg-emerald-500 text-white" : "bg-current/10"
            }`}>
              {etape > 2 ? <Check className="w-3 h-3" /> : 2}
            </span>
            Étape 2 : Mapping des Colonnes
          </div>

          <div className={`flex items-center gap-2.5 py-3 px-4 text-xs font-black border-b-2 transition-all shrink-0 ${
            etape === 3 ? "border-brand-orange text-brand-orange" : "border-transparent text-brand-warm-grey"
          }`}>
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px]">
              3
            </span>
            Étape 3 : Prévisualisation & Classification IA
          </div>

        </div>

        {/* Corps du Wizard */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ======================= ÉTAPE 1 : DROPZONE UPLOAD ======================= */}
          {etape === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto py-6 animate-entree">
              
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void traiterFichier(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-12 text-center rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 ${
                  isDragOver
                    ? "border-brand-orange bg-brand-orange/10 scale-101"
                    : "border-brand-light-grey dark:border-white/15 bg-brand-light-grey/10 dark:bg-white/2 hover:border-brand-orange/60 hover:bg-brand-light-grey/20 dark:hover:bg-white/5"
                }`}
              >
                <div className="p-4 rounded-2xl bg-brand-orange/15 text-brand-orange">
                  {parsingLoading ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-black font-outfit text-brand-black dark:text-white">
                    Glissez-déposez votre fichier ici, ou cliquez pour parcourir
                  </h3>
                  <p className="text-xs text-brand-warm-grey">
                    Formats acceptés : <strong>Microsoft Excel (.xlsx, .xls)</strong> et <strong>Fichiers texte (.csv)</strong>
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void traiterFichier(file);
                  }}
                />
              </div>

              {/* Conseils & Bonnes Pratiques */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2 text-xs">
                <div className="font-extrabold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-crystal" /> Conseils pour un import optimal
                </div>
                <ul className="list-disc list-inside space-y-1 text-blue-900/80 dark:text-blue-200/70 text-[11px]">
                  <li>Assurez-vous que la première ligne du fichier contient le nom des colonnes (ex: Désignation, Prix Achat, etc.).</li>
                  <li>Le moteur analyse automatiquement les mots-clés dans les désignations pour classer chaque article dans la bonne catégorie.</li>
                  <li>Vous pourrez vérifier et corriger chaque suggestion avant l'enregistrement définitif.</li>
                </ul>
              </div>

            </div>
          )}

          {/* ======================= ÉTAPE 2 : MAPPING DES COLONNES ======================= */}
          {etape === 2 && (
            <div className="space-y-6 animate-entree">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10">
                <div>
                  <span className="text-[11px] font-extrabold uppercase text-brand-warm-grey block">Fichier chargé</span>
                  <div className="text-sm font-black text-brand-black dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-brand-orange" />
                    {fichierNom}
                    <span className="text-xs font-bold text-brand-warm-grey">
                      ({lignesBrutes.length} ligne{lignesBrutes.length > 1 ? "s" : ""})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEtape(1)}
                  className="btn btn-secondaire text-xs py-2 px-3 rounded-xl font-bold self-start sm:self-auto"
                >
                  Changer de fichier
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black font-outfit text-brand-black dark:text-white uppercase tracking-wider">
                  Associez les colonnes de votre fichier aux champs de l'application
                </h3>
                <p className="text-xs text-brand-warm-grey">
                  Les correspondances ont été pré-remplies automatiquement. Vérifiez ou ajustez les sélecteurs ci-dessous :
                </p>
              </div>

              {/* Grille de Mapping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COLONNES_CIBLES.map((cible) => {
                  const colonneFichierActuelle = mapping[cible.cleCible] || "";

                  return (
                    <div 
                      key={cible.cleCible}
                      className={`p-4 rounded-2xl border transition-all ${
                        colonneFichierActuelle 
                          ? "bg-white dark:bg-brand-paper border-brand-orange/40 shadow-xs" 
                          : "bg-brand-light-grey/15 dark:bg-white/2 border-brand-light-grey/60 dark:border-white/10 opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1">
                          {cible.label}
                        </label>
                        {colonneFichierActuelle && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Mappé
                          </span>
                        )}
                      </div>

                      <select
                        value={colonneFichierActuelle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMapping((prev) => {
                            const maj = { ...prev };
                            if (!val) delete maj[cible.cleCible];
                            else maj[cible.cleCible] = val;
                            return maj;
                          });
                        }}
                        className="select w-full rounded-xl bg-brand-light-grey/20 dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold h-11"
                      >
                        <option value="">-- Ignorer ce champ --</option>
                        {enTetesFichier.map((h) => (
                          <option key={h} value={h}>
                            Colonne : « {h} » {lignesBrutes[0]?.[h] ? `(Ex: ${String(lignesBrutes[0][h]).substring(0, 30)})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ======================= ÉTAPE 3 : PRÉVISUALISATION & DATA GRID ======================= */}
          {etape === 3 && (
            <div className="space-y-4 animate-entree">
              
              {/* KPIs & Statistiques de Confiance */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div 
                  onClick={() => setFiltreDoute("tous")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    filtreDoute === "tous" 
                      ? "bg-brand-black text-white dark:bg-white dark:text-brand-black shadow-xs" 
                      : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10"
                  }`}
                >
                  <span className="text-[10px] font-extrabold uppercase opacity-70">Total Modèles</span>
                  <div className="text-xl font-black font-outfit mt-0.5">{statsClassification.total}</div>
                </div>

                <div 
                  onClick={() => setFiltreDoute("valides")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    filtreDoute === "valides" 
                      ? "bg-emerald-600 text-white shadow-xs border-emerald-600" 
                      : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10"
                  }`}
                >
                  <span className="text-[10px] font-extrabold uppercase text-emerald-500">Confiance Haute</span>
                  <div className="text-xl font-black font-outfit mt-0.5 text-emerald-600 dark:text-emerald-400">
                    {statsClassification.valides}
                  </div>
                </div>

                <div 
                  onClick={() => setFiltreDoute("doutes")}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    filtreDoute === "doutes" 
                      ? "bg-amber-600 text-white shadow-xs border-amber-600" 
                      : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase text-amber-500">À Confirmer (Doutes)</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-black font-outfit mt-0.5 text-amber-600 dark:text-amber-400">
                    {statsClassification.doutes}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-glow/20 dark:bg-white/5 border border-brand-orange/20">
                  <span className="text-[10px] font-extrabold uppercase text-brand-orange">Unités Physiques</span>
                  <div className="text-xl font-black font-outfit mt-0.5 text-brand-orange">
                    {statsClassification.totalUnites}
                  </div>
                </div>
              </div>

              {/* Barre d'outils (Recherche, Lot global, Pagination) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white dark:bg-brand-paper rounded-2xl border border-brand-light-grey/80 dark:border-white/10">
                
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-brand-warm-grey absolute left-3 top-3" />
                  <input
                    type="text"
                    value={recherchePrevisu}
                    onChange={(e) => { setRecherchePrevisu(e.target.value); setPageCourante(1); }}
                    placeholder="Filtrer par désignation, S/N ou catégorie..."
                    className="input w-full pl-9 rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                  />
                </div>

                {lots.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <span className="text-xs font-bold text-brand-warm-grey whitespace-nowrap">Lot / Arrivage :</span>
                    <select
                      value={lotGlobalId}
                      onChange={(e) => setLotGlobalId(e.target.value)}
                      className="select select-sm rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-bold"
                    >
                      <option value="">Sans arrivage spécifique</option>
                      {lots.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.libelle || `Lot #${l.id}${l.fournisseur ? ` - ${l.fournisseur}` : ""}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              </div>

              {/* Data Grid Interactif de Prévisualisation */}
              <div className="border border-brand-light-grey/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-brand-paper">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-brand-light-grey/30 dark:bg-white/5 border-b border-brand-light-grey/60 dark:border-white/10 text-brand-warm-grey font-black uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3.5">#</th>
                        <th className="py-3 px-3.5">Désignation du Modèle</th>
                        <th className="py-3 px-3.5">Catégorie Attribuée (IA)</th>
                        <th className="py-3 px-3.5 text-center">Qté</th>
                        <th className="py-3 px-3.5">S/N</th>
                        <th className="py-3 px-3.5 text-right">Prix Achat</th>
                        <th className="py-3 px-3.5 text-right">Prix Vente</th>
                        <th className="py-3 px-3.5 text-center">Confiance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-light-grey/30 dark:divide-white/5 font-medium">
                      {lignesAffichees.map((l, index) => {
                        const aUnDoute = l.classification.doute;

                        return (
                          <tr 
                            key={l.id}
                            className={`transition-colors ${
                              aUnDoute 
                                ? "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60" 
                                : "hover:bg-brand-light-grey/15 dark:hover:bg-white/2"
                            }`}
                          >
                            <td className="py-3 px-3.5 font-mono font-bold text-brand-warm-grey">
                              {(pageCourante - 1) * lignesParPage + index + 1}
                            </td>

                            {/* Désignation */}
                            <td className="py-3 px-3.5 max-w-xs">
                              <div className="font-extrabold text-brand-black dark:text-white truncate" title={l.reference}>
                                {l.reference}
                              </div>
                              {l.classification.marque && (
                                <span className="text-[10px] font-bold text-brand-warm-grey bg-brand-light-grey/40 dark:bg-white/10 px-1.5 py-0.2 rounded">
                                  {l.classification.marque}
                                </span>
                              )}
                            </td>

                            {/* Catégorie Interactive */}
                            <td className="py-3 px-3.5 min-w-[220px]">
                              <select
                                value={l.categorie_id_selectionnee}
                                onChange={(e) => changerCategorieLigne(l.id, Number(e.target.value))}
                                className={`w-full rounded-xl px-2.5 py-1.5 text-xs font-bold border transition-all ${
                                  aUnDoute
                                    ? "bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                                    : "bg-brand-light-grey/20 dark:bg-white/5 border-brand-light-grey dark:border-white/10 text-brand-black dark:text-white"
                                }`}
                              >
                                {categoriesPlates.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.chemin}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Quantité */}
                            <td className="py-3 px-3.5 text-center font-bold">
                              <span className="px-2 py-0.5 rounded-md bg-brand-light-grey/40 dark:bg-white/10">
                                {l.quantite}×
                              </span>
                            </td>

                            {/* S/N */}
                            <td className="py-3 px-3.5 font-mono text-[11px]">
                              {l.numero_serie ? (
                                <span className="bg-brand-light-grey/40 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                  {l.numero_serie}
                                </span>
                              ) : (
                                <span className="text-brand-warm-grey italic">—</span>
                              )}
                            </td>

                            {/* Prix Achat */}
                            <td className="py-3 px-3.5 text-right font-bold text-brand-black dark:text-white">
                              {l.prix_achat > 0 ? formaterDA(l.prix_achat) : "—"}
                            </td>

                            {/* Prix Vente */}
                            <td className="py-3 px-3.5 text-right font-extrabold text-brand-orange">
                              {l.prix_vente_fixe ? formaterDA(l.prix_vente_fixe) : "—"}
                            </td>

                            {/* Confiance */}
                            <td className="py-3 px-3.5 text-center">
                              {aUnDoute ? (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300"
                                  title={l.classification.explication}
                                >
                                  <AlertTriangle className="w-3 h-3" /> À vérifier
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Auto
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/2 text-xs">
                    <span className="text-brand-warm-grey">
                      Page {pageCourante} sur {totalPages} ({lignesFiltrees.length} résultats)
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={pageCourante === 1}
                        onClick={() => setPageCourante((p) => Math.max(1, p - 1))}
                        className="btn btn-secondaire text-xs py-1 px-3 rounded-lg disabled:opacity-30"
                      >
                        Précédent
                      </button>
                      <button
                        type="button"
                        disabled={pageCourante === totalPages}
                        onClick={() => setPageCourante((p) => Math.min(totalPages, p + 1))}
                        className="btn btn-secondaire text-xs py-1 px-3 rounded-lg disabled:opacity-30"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer d'actions du Wizard */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/2">
          <div>
            {etape > 1 ? (
              <button
                type="button"
                onClick={() => setEtape((e) => (e - 1) as any)}
                className="btn btn-secondaire text-xs px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
            ) : (
              <button
                type="button"
                onClick={onFermer}
                className="btn btn-secondaire text-xs px-4 py-2.5 rounded-xl font-bold"
              >
                Annuler
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {etape === 2 && (
              <button
                type="button"
                onClick={genererPrevisualisation}
                className="btn btn-primaire text-xs px-6 py-2.5 rounded-xl font-black shadow-xs flex items-center gap-2"
              >
                Prévisualiser & Classifier ({lignesBrutes.length}) <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {etape === 3 && (
              <button
                type="button"
                onClick={executerImport}
                disabled={envoiImport || lignesPrevisu.length === 0}
                className="btn btn-primaire text-xs px-6 py-2.5 rounded-xl font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
              >
                {envoiImport ? (
                  <span>Importation en cours...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Valider et Importer {statsClassification.totalUnites} Unité{statsClassification.totalUnites > 1 ? "s" : ""}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
