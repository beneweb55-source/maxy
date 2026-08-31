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
  ChevronDown,
  ClipboardPaste,
  Download,
  Percent,
  CheckCheck
} from "lucide-react";
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
  const [modeSaisie, setModeSaisie] = useState<"fichier" | "presse_papier">("fichier");

  // Étape 1 : Fichier / Données brutes
  const [fichierNom, setFichierNom] = useState<string>("");
  const [fichierTaille, setFichierTaille] = useState<number>(0);
  const [texteColle, setTexteColle] = useState<string>("");
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

  // Actions de masse Étape 3
  const [valeurPrixAchatMasse, setValeurPrixAchatMasse] = useState<string>("");
  const [pourcentageMargeMasse, setPourcentageMargeMasse] = useState<string>("25");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger l'arborescence des catégories de manière sécurisée
  useEffect(() => {
    if (ouvert) {
      fetch("/api/categories")
        .then((res) => {
          if (!res.ok) throw new Error("Impossible de charger les catégories");
          return res.json();
        })
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
      setModeSaisie("fichier");
      setFichierNom("");
      setFichierTaille(0);
      setTexteColle("");
      setEnTetesFichier([]);
      setLignesBrutes([]);
      setMapping({});
      setLignesPrevisu([]);
      setPageCourante(1);
      setValeurPrixAchatMasse("");
    }
  }, [ouvert]);

  // Liste plate des catégories DB pour assignation
  const categoriesPlates = useMemo(() => {
    const list: { id: number; nom: string; chemin: string }[] = [];
    if (!Array.isArray(categoriesArbre)) return list;
    for (const fam of categoriesArbre) {
      if (!fam || typeof fam !== "object") continue;
      list.push({ id: fam.id, nom: fam.nom || "Sans nom", chemin: fam.nom || "Sans nom" });
      for (const cat of fam.enfants || []) {
        if (!cat || typeof cat !== "object") continue;
        list.push({ id: cat.id, nom: cat.nom || "Sans nom", chemin: `${fam.nom} › ${cat.nom}` });
        for (const sub of cat.enfants || []) {
          if (!sub || typeof sub !== "object") continue;
          list.push({ id: sub.id, nom: sub.nom || "Sans nom", chemin: `${fam.nom} › ${cat.nom} › ${sub.nom}` });
        }
      }
    }
    return list;
  }, [categoriesArbre]);

  // Téléchargement d'un modèle CSV / Excel exemple
  const telechargerModeleExemple = () => {
    const entetes = "Désignation,Quantité,Prix Achat (DA),Prix Vente (DA),Numéro de Série (S/N),Grade\n";
    const lignesExemple = [
      'Lenovo ThinkPad T480 i5 8Go 256Go SSD,3,35000,45000,,Grade A',
      'Dell OptiPlex 7070 SFF i7 16Go 512Go SSD,1,48000,62000,SN-984214,Neuf',
      'Chargeur Original HP 65W Type-C,10,2500,4000,,Neuf',
      'Disque SSD Kingston NV2 1To NVMe,5,8500,11500,,Neuf',
      'Scanner Douchette Caisse Aures USB,2,9000,13500,,Grade A+',
    ].join("\n");

    const blob = new Blob(["\uFEFF" + entetes + lignesExemple], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Modele_Import_Maxy.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Traitement d'un texte copié-collé (depuis Excel ou texte brut)
  const traiterTexteColle = () => {
    const brut = texteColle.trim();
    if (!brut) {
      afficher("Veuillez coller des données dans la zone de texte.", "erreur");
      return;
    }

    setParsingLoading(true);
    setFichierNom("Presse-papier (Texte/Excel)");

    try {
      const lignes = brut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lignes.length === 0) {
        throw new Error("Aucune ligne détectée.");
      }

      // Détecter le séparateur : tabulation (Excel) vs virgule vs point-virgule
      const premiereLigne = lignes[0]!;
      let separateur = "\t";
      if (premiereLigne.includes("\t")) {
        separateur = "\t";
      } else if (premiereLigne.includes(";")) {
        separateur = ";";
      } else if (premiereLigne.includes(",")) {
        separateur = ",";
      }

      // Si la première ligne ressemble à des en-têtes
      let headers: string[] = [];
      let donneesLignes: string[][] = [];

      const colPremiere = premiereLigne.split(separateur).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const sembleEnTete = colPremiere.some((h) => 
        ["nom", "designation", "modele", "prix", "achat", "vente", "qte", "quantite", "sn", "serie"].some((mot) =>
          h.toLowerCase().includes(mot)
        )
      );

      if (sembleEnTete && lignes.length > 1) {
        headers = colPremiere;
        donneesLignes = lignes.slice(1).map((l) => l.split(separateur).map((c) => c.trim().replace(/^["']|["']$/g, "")));
      } else {
        // En-têtes automatiques générés
        const nbColonnes = colPremiere.length;
        headers = ["Désignation / Référence"];
        if (nbColonnes >= 2) headers.push("Quantité");
        if (nbColonnes >= 3) headers.push("Prix Achat");
        if (nbColonnes >= 4) headers.push("Prix Vente");
        if (nbColonnes >= 5) headers.push("Numéro de Série");
        for (let i = 6; i <= nbColonnes; i++) headers.push(`Colonne ${i}`);
        
        donneesLignes = lignes.map((l) => l.split(separateur).map((c) => c.trim().replace(/^["']|["']$/g, "")));
      }

      const rows: Record<string, any>[] = donneesLignes.map((cols) => {
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          obj[h] = cols[idx] || "";
        });
        return obj;
      });

      appliquerDonneesParsees(headers, rows);
    } catch (err: any) {
      afficher(`Erreur lors de l'analyse : ${err.message}`, "erreur");
      setParsingLoading(false);
    }
  };

  // Lecture asynchrone sécurisée du fichier (CSV ou XLSX avec dynamic import)
  const traiterFichier = async (file: File) => {
    setParsingLoading(true);
    setFichierNom(file.name);
    setFichierTaille(file.size);

    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      if (ext === "csv" || ext === "txt") {
        const Papa = (await import("papaparse")).default;
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
        const XLSX = await import("xlsx");
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
        afficher("Format non supporté. Veuillez importer un fichier .xlsx, .xls ou .csv", "erreur");
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

    // Auto-détection intelligente du mapping
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

    // Si aucune colonne désignation n'a été détectée, prendre la première par défaut
    if (!nouveauMapping.reference && headers.length > 0) {
      nouveauMapping.reference = headers[0]!;
    }

    setMapping(nouveauMapping);
    setParsingLoading(false);
    setEtape(2);
  };

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

  // Actions d'aide de masse (Facilitation du remplissage)
  const appliquerPrixAchatMasse = () => {
    const p = Number(valeurPrixAchatMasse);
    if (isNaN(p) || p <= 0) return;
    setLignesPrevisu((prev) =>
      prev.map((l) => (l.prix_achat === 0 ? { ...l, prix_achat: p } : l))
    );
    afficher(`Prix d'achat de ${formaterDA(p)} appliqué à toutes les lignes sans prix.`, "succes");
  };

  const appliquerMargeMasse = () => {
    const marge = Number(pourcentageMargeMasse) || 25;
    const coeff = 1 + marge / 100;
    setLignesPrevisu((prev) =>
      prev.map((l) => {
        if (l.prix_achat > 0 && (!l.prix_vente_fixe || l.prix_vente_fixe === 0)) {
          return { ...l, prix_vente_fixe: Math.round(l.prix_achat * coeff) };
        }
        return l;
      })
    );
    afficher(`Prix de vente (+${marge}%) calculé pour toutes les lignes.`, "succes");
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

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-entree">
      <div className="relative w-11/12 max-w-5xl max-h-[94vh] flex flex-col bg-white dark:bg-brand-paper rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header de l'Assistant */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-orange/15 text-brand-orange">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">
                  Assistant Intelligent (Wizard)
                </span>
                <h2 className="text-lg font-black font-outfit text-brand-black dark:text-white">
                  Importation Massive de Produits
                </h2>
              </div>
              <p className="text-xs text-brand-warm-grey font-medium">
                Importation par fichier Excel/CSV ou Copier-Coller avec classification automatique
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

        {/* Stepper Progress Indicator */}
        <div className="flex border-b border-slate-200/80 dark:border-white/10 px-6 bg-slate-50/40 dark:bg-white/1 overflow-x-auto">
          
          <div className={`flex items-center gap-2.5 py-3 px-4 text-xs font-black border-b-2 transition-all shrink-0 ${
            etape === 1 ? "border-brand-orange text-brand-orange" : etape > 1 ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-brand-warm-grey"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              etape > 1 ? "bg-emerald-500 text-white" : "bg-current/10"
            }`}>
              {etape > 1 ? <Check className="w-3 h-3" /> : 1}
            </span>
            Étape 1 : Source (Fichier ou Texte)
          </div>

          <div className={`flex items-center gap-2.5 py-3 px-4 text-xs font-black border-b-2 transition-all shrink-0 ${
            etape === 2 ? "border-brand-orange text-brand-orange" : etape > 2 ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-brand-warm-grey"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
              etape > 2 ? "bg-emerald-500 text-white" : "bg-current/10"
            }`}>
              {etape > 2 ? <Check className="w-3 h-3" /> : 2}
            </span>
            Étape 2 : Association des Colonnes
          </div>

          <div className={`flex items-center gap-2.5 py-3 px-4 text-xs font-black border-b-2 transition-all shrink-0 ${
            etape === 3 ? "border-brand-orange text-brand-orange" : "border-transparent text-brand-warm-grey"
          }`}>
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px]">
              3
            </span>
            Étape 3 : Prévisualisation & Remplissage Rapide
          </div>

        </div>

        {/* Corps du Wizard */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ======================= ÉTAPE 1 : SOURCE DES DONNÉES ======================= */}
          {etape === 1 && (
            <div className="space-y-6 animate-entree">
              
              {/* Sélecteur Mode : Fichier vs Copier-Coller */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/80 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setModeSaisie("fichier")}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                      modeSaisie === "fichier"
                        ? "bg-white dark:bg-brand-black text-brand-orange shadow-xs"
                        : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" /> Déposer un Fichier (.xlsx / .csv)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeSaisie("presse_papier")}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                      modeSaisie === "presse_papier"
                        ? "bg-white dark:bg-brand-black text-brand-orange shadow-xs"
                        : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                    }`}
                  >
                    <ClipboardPaste className="w-4 h-4" /> Copier-Coller depuis Excel
                  </button>
                </div>

                <button
                  type="button"
                  onClick={telechargerModeleExemple}
                  className="btn btn-secondaire text-xs h-10 px-3.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0"
                  title="Télécharger un modèle de tableau prêt à l'emploi"
                >
                  <Download className="w-4 h-4 text-brand-orange" />
                  <span className="hidden sm:inline">Télécharger Modèle Exemple</span>
                </button>
              </div>

              {modeSaisie === "fichier" ? (
                /* Zone Dropzone Fichier */
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      void traiterFichier(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 ${
                    isDragOver
                      ? "border-brand-orange bg-brand-orange/10 scale-101"
                      : "border-slate-300 dark:border-white/15 hover:border-brand-orange bg-slate-50/50 dark:bg-white/2"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        void traiterFichier(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-16 h-16 rounded-3xl bg-brand-orange/15 text-brand-orange flex items-center justify-center shadow-inner">
                    {parsingLoading ? (
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    ) : (
                      <UploadCloud className="w-8 h-8" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-base sm:text-lg font-black text-brand-black dark:text-white">
                      {parsingLoading ? "Lecture du fichier en cours..." : "Glissez-déposez votre fichier ici, ou cliquez pour parcourir"}
                    </p>
                    <p className="text-xs text-brand-warm-grey font-medium">
                      Formats supportés : <strong>Microsoft Excel (.xlsx, .xls)</strong> ou <strong>CSV (.csv)</strong>
                    </p>
                  </div>
                </div>
              ) : (
                /* Zone Copier-Coller */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
                      <ClipboardPaste className="w-4 h-4 text-brand-orange" />
                      Collez directement vos lignes copiées depuis Excel, Google Sheets ou un message :
                    </label>
                    <span className="text-[11px] text-brand-warm-grey">Raccourci : Ctrl + V</span>
                  </div>

                  <textarea
                    rows={8}
                    value={texteColle}
                    onChange={(e) => setTexteColle(e.target.value)}
                    placeholder={`Exemple :\nLenovo ThinkPad T480 i5 8Go 256Go\t3\t35000\t45000\nDell OptiPlex 7070 i7 16Go 512Go\t1\t48000\t62000\nChargeur HP 65W Type-C\t10\t2500\t4000`}
                    className="textarea w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold leading-relaxed p-4"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={traiterTexteColle}
                      disabled={!texteColle.trim() || parsingLoading}
                      className="btn btn-primaire h-12 px-6 rounded-xl font-black text-xs shadow-md shadow-brand-orange/20 flex items-center gap-2"
                    >
                      {parsingLoading ? "Analyse..." : "Analyser les données collées ➔"}
                    </button>
                  </div>
                </div>
              )}

              {/* Conseils & Bonnes Pratiques */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/3 border border-slate-200/80 dark:border-white/10 space-y-2 text-xs">
                <div className="font-extrabold text-brand-black dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-orange" /> Conseils pour un import optimal
                </div>
                <ul className="list-disc list-inside space-y-1 text-brand-warm-grey text-[11px]">
                  <li>Le moteur analyse automatiquement les mots-clés dans les désignations pour classer chaque article (*PC Portables, Fixes, SSD, RAM, GPU, Chargeurs, etc.*).</li>
                  <li>Si une colonne correspond à la <strong>Quantité</strong> (ex: 5 unités), le système créera automatiquement le modèle et générera les 5 exemplaires physiques.</li>
                  <li>À l'étape suivante, vous pourrez vérifier et corriger chaque suggestion avant l'enregistrement définitif.</li>
                </ul>
              </div>

            </div>
          )}

          {/* ======================= ÉTAPE 2 : MAPPING DES COLONNES ======================= */}
          {etape === 2 && (
            <div className="space-y-6 animate-entree">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/3 border border-slate-200/80 dark:border-white/10">
                <div>
                  <span className="text-[11px] font-extrabold uppercase text-brand-warm-grey block">Source chargée</span>
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
                  className="btn btn-secondaire text-xs h-10 px-4 rounded-xl font-bold self-start sm:self-auto"
                >
                  Changer de source
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black font-outfit text-brand-black dark:text-white uppercase tracking-wider">
                  Associez les colonnes de votre fichier aux champs de l'inventaire
                </h3>
                <p className="text-xs text-brand-warm-grey">
                  Les correspondances ont été pré-remplies automatiquement. Vous pouvez ajuster ou ignorer des champs :
                </p>
              </div>

              {/* Grille de Mapping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COLONNES_CIBLES.map((cible) => {
                  const colonneAssignee = mapping[cible.cleCible] || "";
                  return (
                    <div
                      key={cible.cleCible}
                      className={`p-4 rounded-2xl border transition-all ${
                        colonneAssignee
                          ? "bg-slate-50/80 dark:bg-white/3 border-slate-200 dark:border-white/10 shadow-xs"
                          : "bg-white dark:bg-brand-paper border-slate-200 dark:border-white/10 opacity-80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-black uppercase text-brand-black dark:text-white flex items-center gap-1.5">
                          {cible.label}
                        </label>
                        {cible.obligatoire && (
                          <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                            Requis
                          </span>
                        )}
                      </div>

                      <select
                        value={colonneAssignee}
                        onChange={(e) => setMapping({ ...mapping, [cible.cleCible]: e.target.value })}
                        className="select w-full h-11 rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs font-bold text-brand-black dark:text-white shadow-xs"
                      >
                        <option value="">-- Ignorer / Non présent dans le fichier --</option>
                        {enTetesFichier.map((h) => (
                          <option key={h} value={h}>
                            Colonne « {h} » (Ex: {String(lignesBrutes[0]?.[h] ?? "").slice(0, 30)})
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEtape(1)}
                  className="btn btn-secondaire text-xs h-12 px-5 rounded-xl font-bold"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Retour
                </button>

                <button
                  type="button"
                  onClick={genererPrevisualisation}
                  disabled={!mapping.reference}
                  className="btn btn-primaire text-xs h-12 px-6 rounded-xl font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
                >
                  Lancer l'analyse & Prévisualisation ➔
                </button>
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
                      : "bg-white dark:bg-brand-paper border-slate-200 dark:border-white/10"
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
                      : "bg-white dark:bg-brand-paper border-slate-200 dark:border-white/10"
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
                      : "bg-white dark:bg-brand-paper border-slate-200 dark:border-white/10"
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

                <div className="p-3.5 rounded-2xl bg-brand-orange/10 border border-brand-orange/20">
                  <span className="text-[10px] font-extrabold uppercase text-brand-orange">Unités Physiques</span>
                  <div className="text-xl font-black font-outfit mt-0.5 text-brand-orange">
                    {statsClassification.totalUnites}
                  </div>
                </div>
              </div>

              {/* Barre d'outils de Facilitation Rapide (Prix par défaut, Marge, Arrivage) */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/3 border border-slate-200/80 dark:border-white/10 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange block">
                  Outils de remplissage rapide en 1 clic
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* P.A par défaut */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={valeurPrixAchatMasse}
                      onChange={(e) => setValeurPrixAchatMasse(e.target.value)}
                      placeholder="Prix Achat par défaut (DA)"
                      className="input input-sm h-10 flex-1 rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={appliquerPrixAchatMasse}
                      className="btn btn-secondaire text-xs h-10 px-3 rounded-xl font-bold shrink-0"
                    >
                      Appliquer aux 0 DA
                    </button>
                  </div>

                  {/* Calcul auto Prix de Vente */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Percent className="w-3.5 h-3.5 text-brand-warm-grey absolute left-2.5 top-3" />
                      <input
                        type="number"
                        min="0"
                        value={pourcentageMargeMasse}
                        onChange={(e) => setPourcentageMargeMasse(e.target.value)}
                        placeholder="Marge %"
                        className="input input-sm h-10 pl-8 w-full rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={appliquerMargeMasse}
                      className="btn btn-secondaire text-xs h-10 px-3 rounded-xl font-bold shrink-0 text-brand-orange border-brand-orange/30 hover:bg-brand-orange/10"
                    >
                      Calculer Prix Vente
                    </button>
                  </div>

                  {/* Arrivage global */}
                  {lots.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={lotGlobalId}
                        onChange={(e) => setLotGlobalId(e.target.value)}
                        className="select select-sm h-10 w-full rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs font-bold"
                      >
                        <option value="">Rattacher à un Arrivage / Lot</option>
                        {lots.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.libelle || `Lot #${l.id}${l.fournisseur ? ` - ${l.fournisseur}` : ""}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>
              </div>

              {/* Recherche textuelle & Sélecteur Filtre */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-brand-warm-grey absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={recherchePrevisu}
                    onChange={(e) => { setRecherchePrevisu(e.target.value); setPageCourante(1); }}
                    placeholder="Filtrer par désignation, S/N ou catégorie..."
                    className="input w-full pl-9 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold h-11"
                  />
                </div>
              </div>

              {/* Data Grid Interactif de Prévisualisation */}
              <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs bg-white dark:bg-brand-paper">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 z-10">
                      <tr className="text-brand-warm-grey font-black uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3.5">#</th>
                        <th className="py-3 px-3.5">Désignation Produit</th>
                        <th className="py-3 px-3.5">Catégorie Attribuée</th>
                        <th className="py-3 px-3.5 text-center">Confiance</th>
                        <th className="py-3 px-3.5 text-center">Qté</th>
                        <th className="py-3 px-3.5 text-right">P.A (DA)</th>
                        <th className="py-3 px-3.5 text-right">P.V (DA)</th>
                        <th className="py-3 px-3.5">S/N</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                      {lignesAffichees.map((l, index) => {
                        const estDoute = l.classification.doute;
                        return (
                          <tr
                            key={l.id}
                            className={`transition-colors ${
                              estDoute
                                ? "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/50"
                                : "hover:bg-slate-50/80 dark:hover:bg-white/2"
                            }`}
                          >
                            <td className="py-3 px-3.5 font-mono text-[11px] text-brand-warm-grey">
                              {(pageCourante - 1) * lignesParPage + index + 1}
                            </td>

                            <td className="py-3 px-3.5 font-bold text-brand-black dark:text-white max-w-xs truncate" title={l.reference}>
                              {l.reference}
                            </td>

                            <td className="py-3 px-3.5">
                              <select
                                value={l.categorie_id_selectionnee}
                                onChange={(e) => changerCategorieLigne(l.id, Number(e.target.value))}
                                className={`select select-xs rounded-lg font-bold border max-w-[200px] ${
                                  estDoute 
                                    ? "border-amber-400 bg-amber-50 dark:bg-brand-black text-amber-800 dark:text-amber-300"
                                    : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-brand-black"
                                }`}
                              >
                                {categoriesPlates.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.chemin}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-3 px-3.5 text-center">
                              {estDoute ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3" /> À vérifier
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Haute
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3.5 text-center font-bold">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono">
                                {l.quantite}
                              </span>
                            </td>

                            <td className="py-3 px-3.5 text-right font-black">
                              <input
                                type="number"
                                min="0"
                                value={l.prix_achat}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setLignesPrevisu((prev) =>
                                    prev.map((item) => (item.id === l.id ? { ...item, prix_achat: val } : item))
                                  );
                                }}
                                className="input input-xs w-20 text-right font-black rounded-lg border-slate-200 dark:border-white/10"
                              />
                            </td>

                            <td className="py-3 px-3.5 text-right font-black text-brand-orange">
                              <input
                                type="number"
                                min="0"
                                value={l.prix_vente_fixe ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value ? Number(e.target.value) : null;
                                  setLignesPrevisu((prev) =>
                                    prev.map((item) => (item.id === l.id ? { ...item, prix_vente_fixe: val } : item))
                                  );
                                }}
                                placeholder="—"
                                className="input input-xs w-20 text-right font-black text-brand-orange rounded-lg border-slate-200 dark:border-white/10"
                              />
                            </td>

                            <td className="py-3 px-3.5 font-mono text-[11px] text-brand-warm-grey">
                              {l.numero_serie || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
                    <span className="text-xs text-brand-warm-grey font-medium">
                      Page {pageCourante} sur {totalPages} ({lignesFiltrees.length} articles)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pageCourante <= 1}
                        onClick={() => setPageCourante((p) => p - 1)}
                        className="btn btn-secondaire text-xs h-9 px-3 rounded-lg font-bold"
                      >
                        Précédent
                      </button>
                      <button
                        type="button"
                        disabled={pageCourante >= totalPages}
                        onClick={() => setPageCourante((p) => p + 1)}
                        className="btn btn-secondaire text-xs h-9 px-3 rounded-lg font-bold"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Boutons Finaux */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEtape(2)}
                  className="btn btn-secondaire text-xs h-12 px-5 rounded-xl font-bold"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Revenir au Mapping
                </button>

                <button
                  type="button"
                  onClick={executerImport}
                  disabled={envoiImport || lignesPrevisu.length === 0}
                  className="btn btn-primaire text-xs h-12 px-6 rounded-xl font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
                >
                  {envoiImport ? (
                    <span>Insertion des produits en cours...</span>
                  ) : (
                    <>
                      <CheckCheck className="w-5 h-5" />
                      Valider et Importer {statsClassification.totalUnites} Exemplaire{statsClassification.totalUnites > 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
