"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Barcode, 
  Scan, 
  Plus, 
  X, 
  Check, 
  Layers, 
  Tag, 
  Printer, 
  Package, 
  Eye, 
  Archive, 
  Cpu, 
  HardDrive, 
  Monitor, 
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Tv,
  Zap,
  Server,
  FolderTree,
  DollarSign,
  Trash2
} from "lucide-react";
import type { StatutProduit } from "@prisma/client";
import { formaterDA } from "@/lib/caisse";
import { 
  MATRICE_EQUIPEMENTS, 
  determinerProfilEquipement, 
  genererDesignationAutomatique,
  type ProfilEquipement 
} from "@/lib/matrice-specifications";
import { devinerCategorie, type SuggestionCategorie } from "@/lib/category-guesser";
import { getMarquesPourCategorie } from "@/lib/marques";

interface SousCategorieOption {
  id: number;
  nom: string;
  parent_nom?: string;
  parent_id?: number | null;
  famille_nom?: string;
}

interface ModeleSearchResult {
  id: number;
  nom: string;
  categorie_id: number;
  prix_vente_conseille: number | null;
  categorie: { id: number; nom: string; parent?: { nom: string } };
  attributs: any;
}

interface ModaleAjoutTerrainProps {
  ouverte: boolean;
  onFermer: () => void;
  onSucces: (res: { codes: string[]; ajoutes: number }) => void;
  lotsDisponibles?: { id: number; libelle: string }[];
  modeleInitial?: ModeleSearchResult | null;
  categorieDefautId?: number | null;
}

export default function ModaleAjoutTerrain({
  ouverte,
  onFermer,
  onSucces,
  lotsDisponibles = [],
  modeleInitial = null,
  categorieDefautId = null
}: ModaleAjoutTerrainProps) {
  // Stepper : Étape 1 = Modèle / Classification, Étape 2 = Spécifications Techniques, Étape 3 = Arrivage & Exemplaires
  const [etape, setEtape] = useState<1 | 2 | 3>(1);
  const [onglet, setOnglet] = useState<"nouveau_modele" | "modele_existant">(
    modeleInitial ? "modele_existant" : "nouveau_modele"
  );

  // Arborescence sous-catégories
  const [sousCategories, setSousCategories] = useState<SousCategorieOption[]>([]);
  const [sousCatId, setSousCatId] = useState<number | "">(categorieDefautId || "");

  // Recherche modèle existant
  const [rechercheModele, setRechercheModele] = useState("");
  const [modelesTrouves, setModelesTrouves] = useState<ModeleSearchResult[]>([]);
  const [modeleSelectionne, setModeleSelectionne] = useState<ModeleSearchResult | null>(modeleInitial);
  const [chargementModeles, setChargementModeles] = useState(false);

  // Données du modèle (Étape 1)
  const [marque, setMarque] = useState("");
  const [nomBase, setNomBase] = useState("");
  const [designationComplete, setDesignationComplete] = useState("");
  const [prixVenteConseille, setPrixVenteConseille] = useState<string>("");

  // Spécifications dynamiques de la matrice (Étape 2)
  const [specs, setSpecs] = useState<Record<string, any>>({});

  // Exemplaires physiques & Stock (Étape 3)
  const [quantite, setQuantite] = useState<number>(1);
  const [prixAchat, setPrixAchat] = useState<string>("");
  const [prixVenteFixe, setPrixVenteFixe] = useState<string>("");
  const [lotId, setLotId] = useState<string>("");
  const [gradeGlobal, setGradeGlobal] = useState<string>("Grade A");
  const [emplacementGlobal, setEmplacementGlobal] = useState<"reserve" | "vitrine">("reserve");
  const [estCompose, setEstCompose] = useState<boolean>(false);
  const [imprimerDirect, setImprimerDirect] = useState<boolean>(true);

  // Scanner douchette S/N
  const [scanInput, setScanInput] = useState<string>("");
  const [numerosSerie, setNumerosSerie] = useState<string[]>([]);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // État de soumission
  const [enSoumission, setEnSoumission] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Auto-Catégorisation Intelligente
  const [suggestionAuto, setSuggestionAuto] = useState<SuggestionCategorie | null>(null);
  const [categorieModifieeManuellement, setCategorieModifieeManuellement] = useState(false);

  // Accordion spécifications techniques (masquées par défaut, optionnelles)
  const [specsOuvertes, setSpecsOuvertes] = useState(false);

  // Profil d'équipement dynamique déterminé selon la sous-catégorie sélectionnée
  const sousCatSelectionnee = sousCategories.find((sc) => sc.id === sousCatId);
  const profilActif = determinerProfilEquipement(
    sousCatSelectionnee?.nom || "",
    sousCatSelectionnee?.parent_nom || sousCatSelectionnee?.famille_nom || ""
  );

  // Auto-Catégorisation Intelligente automatique sur la saisie Marque & Modèle
  useEffect(() => {
    if (onglet !== "nouveau_modele" || categorieModifieeManuellement) return;
    const texteAAnalyser = `${marque} ${nomBase}`.trim();
    if (texteAAnalyser.length < 3) {
      setSuggestionAuto(null);
      return;
    }

    const suggestion = devinerCategorie(texteAAnalyser);
    if (suggestion && sousCategories.length > 0) {
      setSuggestionAuto(suggestion);
      const nomCible = suggestion.categorieNom.toLowerCase();
      const sousCatCible = suggestion.sousCategorieNom?.toLowerCase();
      const familleCible = suggestion.familleNom.toLowerCase();

      const match = sousCategories.find((sc) => {
        const scNom = sc.nom.toLowerCase();
        const scParent = (sc.parent_nom || "").toLowerCase();
        const scFamille = (sc.famille_nom || "").toLowerCase();

        return (
          (sousCatCible && (scNom.includes(sousCatCible) || sousCatCible.includes(scNom))) ||
          scNom.includes(nomCible) ||
          nomCible.includes(scNom) ||
          scParent.includes(nomCible) ||
          (scFamille.includes(familleCible) && scNom.includes(nomCible))
        );
      });

      if (match && match.id !== sousCatId) {
        setSousCatId(match.id);
      }
    }
  }, [marque, nomBase, sousCategories, onglet, categorieModifieeManuellement, sousCatId]);

  // 1. Charger les catégories au montage
  useEffect(() => {
    async function chargerArborescence() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          // Aplatir l'arborescence pour extraire les sous-catégories de niveau 3
          const feuilles: SousCategorieOption[] = [];
          
          if (Array.isArray(data)) {
            data.forEach((famille: any) => {
              if (famille.enfants && Array.isArray(famille.enfants)) {
                famille.enfants.forEach((cat: any) => {
                  if (cat.enfants && Array.isArray(cat.enfants) && cat.enfants.length > 0) {
                    cat.enfants.forEach((sc: any) => {
                      feuilles.push({
                        id: sc.id,
                        nom: sc.nom,
                        parent_nom: cat.nom,
                        parent_id: cat.id,
                        famille_nom: famille.nom
                      });
                    });
                  } else {
                    feuilles.push({
                      id: cat.id,
                      nom: cat.nom,
                      parent_nom: famille.nom,
                      parent_id: famille.id,
                      famille_nom: famille.nom
                    });
                  }
                });
              } else {
                feuilles.push({ id: famille.id, nom: famille.nom });
              }
            });
          }
          setSousCategories(feuilles);
          if (categorieDefautId) {
            const match = feuilles.find((f) => f.id === categorieDefautId || f.parent_id === categorieDefautId);
            if (match) setSousCatId(match.id);
            else setSousCatId(categorieDefautId);
          } else if (!sousCatId && feuilles.length > 0 && feuilles[0]) {
            setSousCatId(feuilles[0].id);
          }
        }
      } catch (err) {
        console.error("Erreur chargement catégories:", err);
      }
    }
    if (ouverte) {
      void chargerArborescence();
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [ouverte, categorieDefautId]);

  // 2. Recherche en direct de modèles
  useEffect(() => {
    if (onglet !== "modele_existant") return;
    const q = rechercheModele.trim();
    const timer = setTimeout(async () => {
      setChargementModeles(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (sousCatId) params.set("categorie_id", String(sousCatId));
        const res = await fetch(`/api/modeles?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setModelesTrouves(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Erreur recherche modèles:", err);
      } finally {
        setChargementModeles(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [rechercheModele, sousCatId, onglet]);

  // 3. Mise à jour de la désignation automatique lors de la modification des specs
  useEffect(() => {
    if (onglet === "nouveau_modele") {
      const auto = genererDesignationAutomatique(profilActif, specs, marque, nomBase);
      if (auto) {
        setDesignationComplete(auto);
      }
    }
  }, [profilActif, specs, marque, nomBase, onglet]);

  // 4. Initialisation lors de la sélection d'un modèle existant
  const choisirModele = (m: ModeleSearchResult) => {
    setModeleSelectionne(m);
    setSousCatId(m.categorie_id);
    setDesignationComplete(m.nom);
    if (m.prix_vente_conseille) {
      setPrixVenteConseille(String(m.prix_vente_conseille));
      setPrixVenteFixe(String(m.prix_vente_conseille));
    }
    if (m.attributs) {
      setSpecs(m.attributs);
    }
  };

  // 5. Gestion de l'ajout d'un S/N par douchette
  const ajouterNumeroSerie = (sn: string) => {
    const nettoye = sn.trim();
    if (!nettoye) return;
    if (numerosSerie.includes(nettoye)) {
      setErreur(`Le numéro de série ${nettoye} a déjà été scanné.`);
      return;
    }
    setErreur(null);
    setNumerosSerie((prev) => [...prev, nettoye]);
    setScanInput("");
    if (quantite < numerosSerie.length + 1) {
      setQuantite(numerosSerie.length + 1);
    }
  };

  const supprimerNumeroSerie = (index: number) => {
    setNumerosSerie((prev) => prev.filter((_, i) => i !== index));
  };

  // 6. Validation et passage d'étape
  const passerEtape2 = () => {
    setErreur(null);
    if (onglet === "modele_existant") {
      if (!modeleSelectionne) {
        setErreur("Veuillez sélectionner un modèle existant ou choisir 'Nouveau modèle'.");
        return;
      }
    } else {
      if (!sousCatId) {
        setErreur("Veuillez sélectionner une catégorie.");
        return;
      }
      if (!nomBase && !designationComplete) {
        setErreur("Veuillez renseigner le nom ou modèle de l'équipement.");
        return;
      }
    }
    // On passe directement à l'étape 3 (arrivage) — les specs sont optionnelles via accordion
    setEtape(3);
  };

  const passerEtape3 = () => {
    setErreur(null);
    // Vérifier les champs obligatoires du profil
    if (profilActif) {
      for (const attr of profilActif.attributs) {
        if (attr.obligatoire && !specs[attr.cle] && !marque && attr.cle === "marque") {
          setErreur(`Le champ « ${attr.label} » est obligatoire.`);
          return;
        }
      }
    }
    setEtape(3);
  };

  // 7. Soumission finale : Création du modèle (si nouveau) + Création des exemplaires physiques
  const soumettreFormulaire = async () => {
    setErreur(null);
    const prixAchatNum = Number(prixAchat);
    if (!Number.isFinite(prixAchatNum) || prixAchatNum < 0) {
      setErreur("Veuillez renseigner un prix d'achat valide (0 DA ou plus).");
      return;
    }

    setEnSoumission(true);
    try {
      let finalModeleId = modeleSelectionne?.id;

      // Étape A : Créer le modèle si nouveau
      if (onglet === "nouveau_modele" || !finalModeleId) {
        const nomModeleFinal = designationComplete.trim() || nomBase.trim();
        const resModele = await fetch("/api/modeles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: nomModeleFinal,
            categorie_id: Number(sousCatId),
            attributs: { ...specs, marque: marque || undefined },
            prix_vente_conseille: prixVenteConseille ? Number(prixVenteConseille) : null,
          }),
        });

        if (!resModele.ok) {
          const errData = await resModele.json();
          // Si le modèle existe déjà, on le récupère
          if (errData.error?.includes("existe déjà")) {
            const resSearch = await fetch(`/api/modeles?q=${encodeURIComponent(nomModeleFinal)}&categorie_id=${sousCatId}`);
            const dataSearch = await resSearch.json();
            if (Array.isArray(dataSearch) && dataSearch.length > 0) {
              finalModeleId = dataSearch[0].id;
            } else {
              throw new Error(errData.error || "Erreur lors de la création du modèle.");
            }
          } else {
            throw new Error(errData.error || "Erreur lors de la création du modèle.");
          }
        } else {
          const nouveauModele = await resModele.json();
          finalModeleId = nouveauModele.id;
        }
      }

      // Étape B : Ajouter les exemplaires physiques au modèle
      const resExemplaires = await fetch(`/api/modeles/${finalModeleId}/exemplaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantite: Math.max(1, quantite),
          prix_achat: prixAchatNum,
          prix_vente_fixe: prixVenteFixe ? Number(prixVenteFixe) : (prixVenteConseille ? Number(prixVenteConseille) : null),
          lot_id: lotId ? Number(lotId) : null,
          grade: gradeGlobal,
          emplacement: emplacementGlobal,
          numeros_serie: numerosSerie,
          en_vitrine: emplacementGlobal === "vitrine",
        }),
      });

      if (!resExemplaires.ok) {
        const errData = await resExemplaires.json();
        throw new Error(errData.error || "Erreur lors de l'ajout des exemplaires.");
      }

      const resultat = await resExemplaires.json();

      // Impression directe optionnelle
      if (imprimerDirect && Array.isArray(resultat.codes) && resultat.codes.length > 0) {
        window.open(`/imprimer-etiquettes?codes=${resultat.codes.join(",")}`, "_blank");
      }

      onSucces({
        codes: resultat.codes || [],
        ajoutes: resultat.ajoutes || quantite,
      });
      onFermer();
    } catch (err: any) {
      console.error("Erreur soumission formulaire terrain:", err);
      setErreur(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setEnSoumission(false);
    }
  };

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/20 backdrop-blur-sm animate-entree overflow-y-auto">
      <div className="relative w-full max-w-[95vw] sm:max-w-4xl max-h-[85vh] bg-white dark:bg-brand-paper rounded-3xl shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden my-auto">
        
        {/* HEADER MODALE POS */}
        <div className="px-4 sm:px-6 py-4 border-b border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-outfit text-brand-black dark:text-white leading-tight">
                Entrée en Stock & Fiche Matériel
              </h2>
              <p className="text-xs text-brand-warm-grey">
                Saisie rapide au comptoir avec détection intelligente des spécifications
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center text-brand-warm-grey hover:text-brand-black dark:hover:text-white rounded-xl hover:bg-brand-light-grey/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEPPER PROGRESS BAR TACTILE */}
        <div className="px-6 py-3 bg-brand-light-grey/5 dark:bg-white/2 border-b border-brand-light-grey/30 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 w-full">
            
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setEtape(1)}
              className={`flex items-center gap-2 text-xs font-bold transition-all ${
                etape === 1
                  ? "text-brand-orange"
                  : etape > 1
                  ? "text-brand-black dark:text-white"
                  : "text-brand-warm-grey"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                etape === 1
                  ? "bg-brand-orange text-white"
                  : etape > 1
                  ? "bg-brand-green/20 text-brand-green"
                  : "bg-brand-light-grey text-brand-warm-grey"
              }`}>
                {etape > 1 ? <Check className="w-3.5 h-3.5" /> : "1"}
              </div>
              <span className="hidden sm:inline">1. Modèle &amp; Catégorie</span>
            </button>

            <div className="h-0.5 flex-1 bg-brand-light-grey/50 dark:bg-white/10" />

            {/* Step 2 — Exemplaires & Scan */}
            <button
              type="button"
              onClick={() => { if (modeleSelectionne || (sousCatId && (nomBase || designationComplete))) setEtape(3); }}
              className={`flex items-center gap-2 text-xs font-bold transition-all ${
                etape === 3
                  ? "text-brand-orange"
                  : "text-brand-warm-grey"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                etape === 3
                  ? "bg-brand-orange text-white"
                  : "bg-brand-light-grey text-brand-warm-grey"
              }`}>
                2
              </div>
              <span className="hidden sm:inline">2. Exemplaires &amp; Scan</span>
            </button>

          </div>
        </div>

        {/* CONTENU PRINCIPAL PAR ÉTAPE */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Message d'erreur */}
          {erreur && (
            <div className="p-3.5 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 1 : MODÈLE & CLASSIFICATION */}
          {/* ========================================================================= */}
          {etape === 1 && (
            <div className="space-y-6 animate-entree">
              
              {/* Choix Mode : Nouveau Modèle vs Existant */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-brand-light-grey/30 dark:bg-white/5 rounded-2xl border border-brand-light-grey/40 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => { setOnglet("nouveau_modele"); setModeleSelectionne(null); }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    onglet === "nouveau_modele"
                      ? "bg-white dark:bg-brand-paper text-brand-orange shadow-xs"
                      : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                  }`}
                >
                  <Plus className="w-4 h-4" /> Nouveau Modèle
                </button>

                <button
                  type="button"
                  onClick={() => setOnglet("modele_existant")}
                  className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    onglet === "modele_existant"
                      ? "bg-white dark:bg-brand-paper text-brand-orange shadow-xs"
                      : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                  }`}
                >
                  <Search className="w-4 h-4" /> Modèle Existant
                </button>
              </div>

              {/* Sélection Catégorie Hiérarchique */}
              <div>
                <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
                  Catégorie du matériel <span className="text-brand-orange">*</span>
                </label>
                <select
                  value={sousCatId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSousCatId(id);
                    setCategorieModifieeManuellement(true);
                    setModeleSelectionne(null);
                  }}
                  className="select w-full rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-bold text-sm h-12"
                >
                  <option value="">-- Sélectionnez la catégorie --</option>
                  {sousCategories.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.famille_nom ? `${sc.famille_nom} > ` : ""}{sc.parent_nom ? `${sc.parent_nom} > ` : ""}{sc.nom}
                    </option>
                  ))}
                </select>

                {suggestionAuto && (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400 font-black flex items-center gap-1.5 animate-entree">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>✨ Catégorie suggérée automatiquement : <strong>{suggestionAuto.categorieNom}</strong> ({suggestionAuto.familleNom})</span>
                  </p>
                )}

                {profilActif && (
                  <p className="mt-1.5 text-xs text-brand-orange font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Profil détecté : {profilActif.description}
                  </p>
                )}
              </div>

              {/* MODE 1 : NOUVEAU MODÈLE */}
              {onglet === "nouveau_modele" && (
                <div className="space-y-4 pt-2">
                  
                  {/* Marque rapide avec Puces tactiles */}
                  <div>
                    <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
                      Marque / Constructeur
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {getMarquesPourCategorie(sousCatSelectionnee?.nom || "").map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMarque(marque === m ? "" : m)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            marque === m
                              ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                              : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-orange"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={marque}
                      onChange={(e) => setMarque(e.target.value)}
                      placeholder="Ou saisissez une autre marque..."
                      className="input input-sm w-full rounded-xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 text-xs"
                    />
                  </div>

                  {/* Nom / Référence de base du modèle */}
                  <div>
                    <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
                      Modèle / Référence constructeur <span className="text-brand-orange">*</span>
                    </label>
                    <input
                      type="text"
                      value={nomBase}
                      onChange={(e) => setNomBase(e.target.value)}
                      placeholder="ex: ProBook 450 G8, OptiPlex 7070 SFF, 90W Type-C..."
                      className="input w-full rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-bold text-sm h-12"
                    />
                  </div>

                  {/* Aperçu Désignation Complète */}
                  <div className="p-4 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/50 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-brand-warm-grey uppercase tracking-wider">
                        Désignation Commerciale Complète
                      </span>
                      <span className="text-[11px] font-bold text-brand-orange">
                        Générée automatiquement
                      </span>
                    </div>
                    <input
                      type="text"
                      value={designationComplete}
                      onChange={(e) => setDesignationComplete(e.target.value)}
                      className="input w-full rounded-xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-extrabold text-sm"
                    />
                  </div>

                  {/* Prix de vente conseillé */}
                  <div>
                    <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
                      Prix de vente conseillé (Optionnel)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={prixVenteConseille}
                        onChange={(e) => {
                          setPrixVenteConseille(e.target.value);
                          setPrixVenteFixe(e.target.value);
                        }}
                        placeholder="ex: 45000"
                        className="input w-full rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-bold text-sm h-12 pr-12"
                      />
                      <span className="absolute right-4 top-3.5 text-xs font-black text-brand-warm-grey">
                        DA
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {/* MODE 2 : SÉLECTION MODÈLE EXISTANT */}
              {onglet === "modele_existant" && (
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-brand-warm-grey absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={rechercheModele}
                      onChange={(e) => setRechercheModele(e.target.value)}
                      placeholder="Rechercher par nom de modèle ou référence..."
                      className="input w-full pl-11 rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-bold text-sm h-12"
                    />
                  </div>

                  {chargementModeles ? (
                    <div className="p-8 text-center text-brand-warm-grey text-xs font-bold">
                      Recherche des modèles dans le catalogue...
                    </div>
                  ) : modelesTrouves.length === 0 ? (
                    <div className="p-8 text-center text-brand-warm-grey text-xs rounded-2xl border border-dashed border-brand-light-grey dark:border-white/10">
                      Aucun modèle correspondant trouvé. Créez-en un avec l'onglet "Nouveau Modèle".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                      {modelesTrouves.map((m) => {
                        const selectionne = modeleSelectionne?.id === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => choisirModele(m)}
                            className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                              selectionne
                                ? "bg-brand-orange/10 border-brand-orange shadow-xs"
                                : "bg-white dark:bg-brand-paper border-brand-light-grey/70 dark:border-white/10 hover:border-brand-orange/60"
                            }`}
                          >
                            <div>
                              <h4 className="font-extrabold text-xs sm:text-sm text-brand-black dark:text-white">
                                {m.nom}
                              </h4>
                              <p className="text-[11px] text-brand-warm-grey">
                                {m.categorie?.parent ? `${m.categorie.parent.nom} > ` : ""}{m.categorie?.nom}
                                {m.prix_vente_conseille ? ` • Conseillé : ${formaterDA(m.prix_vente_conseille)}` : ""}
                              </p>
                            </div>
                            {selectionne && (
                              <CheckCircle2 className="w-5 h-5 text-brand-orange shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* === ACCORDION : CARACTÉRISTIQUES TECHNIQUES (optionnel) === */}
              {onglet === "nouveau_modele" && profilActif && (
                <div className="border border-brand-light-grey/50 dark:border-white/10 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSpecsOuvertes((v) => !v)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-brand-light-grey/20 dark:hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-orange" />
                      <span className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white">
                        Ajouter des caractéristiques techniques
                      </span>
                      <span className="text-[10px] font-bold text-brand-warm-grey bg-brand-light-grey/40 dark:bg-white/10 px-2 py-0.5 rounded-full">
                        Optionnel
                      </span>
                      {Object.keys(specs).filter(k => specs[k]).length > 0 && (
                        <span className="text-[10px] font-black text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                          {Object.keys(specs).filter(k => specs[k]).length} rempli(s)
                        </span>
                      )}
                    </div>
                    <div className={`transition-transform duration-200 ${specsOuvertes ? "rotate-180" : ""}`}>
                      <ArrowLeft className="w-4 h-4 text-brand-warm-grey -rotate-90" />
                    </div>
                  </button>

                  {specsOuvertes && (
                    <div className="p-4 pt-0 space-y-4 border-t border-brand-light-grey/40 dark:border-white/10 animate-entree">
                      <p className="text-[11px] text-brand-warm-grey">
                        Caractéristiques spécifiques à <strong>{sousCatSelectionnee?.nom}</strong>.
                        La désignation commerciale sera mise à jour automatiquement.
                      </p>
                      {profilActif.attributs.map((attr) => {
                        const valeurActuelle = specs[attr.cle] ?? "";
                        return (
                          <div key={attr.cle} className="space-y-2 p-3.5 rounded-2xl bg-brand-light-grey/15 dark:bg-white/2 border border-brand-light-grey/40 dark:border-white/5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-extrabold text-brand-black dark:text-white uppercase tracking-wider">
                                {attr.label}
                              </label>
                              {attr.aide && (
                                <span className="text-[11px] text-brand-warm-grey italic">{attr.aide}</span>
                              )}
                            </div>
                            {attr.options && attr.options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {attr.options.map((opt: any) => {
                                  const estSelectionne = attr.type === "pills_multi"
                                    ? Array.isArray(valeurActuelle) && valeurActuelle.includes(opt.valeur)
                                    : valeurActuelle === opt.valeur;
                                  return (
                                    <button
                                      key={opt.valeur}
                                      type="button"
                                      onClick={() => {
                                        if (attr.type === "pills_multi") {
                                          const arr = Array.isArray(valeurActuelle) ? [...valeurActuelle] : [];
                                          const nouv = arr.includes(opt.valeur)
                                            ? arr.filter((v: string) => v !== opt.valeur)
                                            : [...arr, opt.valeur];
                                          setSpecs({ ...specs, [attr.cle]: nouv });
                                        } else {
                                          setSpecs({
                                            ...specs,
                                            [attr.cle]: valeurActuelle === opt.valeur ? "" : opt.valeur,
                                          });
                                        }
                                      }}
                                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                                        estSelectionne
                                          ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                                          : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-black dark:text-white hover:border-brand-orange/60"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {attr.type === "text" && (
                              <input
                                type="text"
                                value={valeurActuelle}
                                onChange={(e) => setSpecs({ ...specs, [attr.cle]: e.target.value })}
                                placeholder={attr.placeholder || `Saisir ${attr.label}...`}
                                className="input w-full rounded-xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 text-xs font-bold"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* ÉTAPE 3 : ARRIVAGE & EXEMPLAIRES PHYSIQUES */}
          {/* ========================================================================= */}
          {etape === 3 && (
            <div className="space-y-6 animate-entree">
              
              {/* Carte Récapitulative du Modèle */}
              <div className="p-4 rounded-2xl bg-brand-light-grey/25 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-brand-orange uppercase tracking-wider">
                    Modèle sélectionné
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-brand-black dark:text-white font-outfit leading-snug">
                    {modeleSelectionne?.nom || designationComplete || nomBase}
                  </h3>
                  <p className="text-xs text-brand-warm-grey">
                    {sousCatSelectionnee?.nom}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEtape(1)}
                  className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold"
                >
                  Modifier
                </button>
              </div>

              {/* Paramètres Financiers & Lot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Prix d'Achat Unitaire */}
                <div>
                  <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-1.5 uppercase tracking-wider">
                    Prix d'Achat unitaire (DA) <span className="text-brand-orange">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={prixAchat}
                      onChange={(e) => setPrixAchat(e.target.value)}
                      placeholder="ex: 15000"
                      className="input w-full rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-black text-sm h-12 pr-12"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-black text-brand-warm-grey">
                      DA
                    </span>
                  </div>
                </div>

                {/* Prix de Vente Fixé */}
                <div>
                  <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-1.5 uppercase tracking-wider">
                    Prix de Vente Fixé (DA)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={prixVenteFixe}
                      onChange={(e) => setPrixVenteFixe(e.target.value)}
                      placeholder={prixVenteConseille || "ex: 22000"}
                      className="input w-full rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-black text-sm h-12 pr-12 text-brand-green"
                    />
                    <span className="absolute right-4 top-3.5 text-xs font-black text-brand-warm-grey">
                      DA
                    </span>
                  </div>
                </div>

              </div>

              {/* Paramètres Physiques : Grade & Emplacement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Grade Cosmétique */}
                <div>
                  <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-1.5 uppercase tracking-wider">
                    État / Grade
                  </label>
                  <select
                    value={gradeGlobal}
                    onChange={(e) => setGradeGlobal(e.target.value)}
                    className="select w-full rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-bold text-xs h-11"
                  >
                    <option value="Neuf">Neuf / Emballé</option>
                    <option value="Grade A+">Grade A+ (Impeccable)</option>
                    <option value="Grade A">Grade A (Très bon état)</option>
                    <option value="Grade B">Grade B (Traces d'usage)</option>
                    <option value="Grade C">Grade C (Abîmé / Rayé)</option>
                    <option value="Pour pièces">Pour pièces / HS</option>
                  </select>
                </div>

                {/* Emplacement */}
                <div>
                  <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-1.5 uppercase tracking-wider">
                    Emplacement de départ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEmplacementGlobal("reserve")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        emplacementGlobal === "reserve"
                          ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                          : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                      }`}
                    >
                      <Archive className="w-3.5 h-3.5" /> Réserve
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmplacementGlobal("vitrine")}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                        emplacementGlobal === "vitrine"
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Vitrine
                    </button>
                  </div>
                </div>

              </div>

              {/* Lot d'Arrivage */}
              {lotsDisponibles.length > 0 && (
                <div>
                  <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-1.5 uppercase tracking-wider">
                    Lot d'arrivage (Optionnel)
                  </label>
                  <select
                    value={lotId}
                    onChange={(e) => setLotId(e.target.value)}
                    className="select w-full rounded-2xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-bold text-xs h-11"
                  >
                    <option value="">Hors-lot (Arrivage direct unitaire)</option>
                    {lotsDisponibles.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type de produit (Simple / Composé) */}
              <div>
                <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-1.5 uppercase tracking-wider">
                  Type de Produit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEstCompose(false)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      !estCompose
                        ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                        : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                    }`}
                  >
                    <Package className="w-4 h-4 mb-0.5" />
                    <span>Produit Simple</span>
                    <span className="text-[9px] font-medium opacity-80 text-center">Vendu tel quel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstCompose(true)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      estCompose
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-0.5" />
                    <span>Produit Composé</span>
                    <span className="text-[9px] font-medium opacity-80 text-center">Assemblé avec composants</span>
                  </button>
                </div>
              </div>

              {/* SCAN DOUCHETTE EN CONTINU (S/N) */}
              <div className="p-4 rounded-2xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scan className="w-4 h-4 text-brand-orange" />
                    <label className="text-xs font-black text-brand-black dark:text-white uppercase tracking-wider">
                      Scan Numéros de Série (S/N) à la chaîne
                    </label>
                  </div>
                  <span className="text-xs font-black text-brand-orange">
                    {numerosSerie.length} scanné(s) / {quantite} unité(s)
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        ajouterNumeroSerie(scanInput);
                      }
                    }}
                    placeholder="Scannez avec la douchette ou tapez le S/N puis Entrée..."
                    className="input flex-1 rounded-xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/15 font-mono text-xs h-11"
                  />
                  <button
                    type="button"
                    onClick={() => ajouterNumeroSerie(scanInput)}
                    className="btn btn-primaire px-4 rounded-xl text-xs font-bold"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Quantité totale manuelle */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs text-brand-warm-grey">Quantité totale d'unités à créer :</span>
                  <input
                    type="number"
                    min={Math.max(1, numerosSerie.length)}
                    value={quantite}
                    onChange={(e) => setQuantite(Math.max(numerosSerie.length, Number(e.target.value) || 1))}
                    className="input input-sm w-24 rounded-xl text-center font-black text-xs"
                  />
                </div>

                {/* Liste des numéros de série scannés */}
                {numerosSerie.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 max-h-36 overflow-y-auto">
                    {numerosSerie.map((sn, index) => (
                      <span
                        key={sn}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 shadow-xs"
                      >
                        <span className="text-brand-warm-grey">#{index + 1}</span>
                        <span>{sn}</span>
                        <button
                          type="button"
                          onClick={() => supprimerNumeroSerie(index)}
                          className="text-brand-warm-grey hover:text-danger ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Option Impression Directe */}
              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/40 dark:border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={imprimerDirect}
                  onChange={(e) => setImprimerDirect(e.target.checked)}
                  className="checkbox checkbox-sm checkbox-primary rounded-md"
                />
                <Printer className="w-4 h-4 text-brand-warm-grey" />
                <span className="text-xs font-bold text-brand-black dark:text-white">
                  Ouvrir automatiquement la planche d'étiquettes thermiques après validation
                </span>
              </label>

            </div>
          )}

        </div>

        {/* FOOTER ACTIONS MODALE */}
        <div className="px-6 py-4 border-t border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 flex items-center justify-between gap-3">
          
          {etape > 1 ? (
            <button
              type="button"
              onClick={() => setEtape(1)}
              disabled={enSoumission}
              className="btn btn-secondaire text-xs py-3 px-5 rounded-2xl font-bold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
          ) : (
            <button
              type="button"
              onClick={onFermer}
              disabled={enSoumission}
              className="btn btn-secondaire text-xs py-3 px-5 rounded-2xl font-bold"
            >
              Annuler
            </button>
          )}

          {etape === 1 && (
            <button
              type="button"
              onClick={passerEtape2}
              className="btn btn-primaire text-xs py-3 px-6 rounded-2xl font-black shadow-xs flex items-center gap-2"
            >
              Suivant <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {etape === 3 && (
            <button
              type="button"
              onClick={soumettreFormulaire}
              disabled={enSoumission}
              className="btn btn-primaire text-xs py-3 px-8 rounded-2xl font-black shadow-md flex items-center gap-2 active:scale-95"
            >
              {enSoumission ? (
                <>Enregistrement en cours...</>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Valider &amp; Entrer en Stock ({quantite})
                </>
              )}
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
