"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Tag, 
  Coins, 
  Laptop, 
  Server, 
  HardDrive, 
  Cpu, 
  Zap, 
  Monitor, 
  Printer, 
  Image as ImageIcon,
  ChevronRight,
  SlidersHorizontal,
  Info,
  Building2,
  FolderTree
} from "lucide-react";
import { 
  determinerProfilEquipement, 
  genererDesignationAutomatique, 
  MATRICE_EQUIPEMENTS,
  type ProfilEquipement 
} from "@/lib/matrice-specifications";

interface FormulaireModeleProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces: (modele: any) => void;
  modeleId?: number | null;
  modeleInitial?: {
    id?: number;
    nom: string;
    categorie_id: number;
    image_url?: string | null;
    description?: string | null;
    prix_vente_conseille?: number | null;
    attributs?: Record<string, any> | null;
  } | null;
  categorieIdDefaut?: number | null;
}

const MARQUES_FREQUENTES = [
  "Lenovo", "HP", "Dell", "Apple", "Asus", "Acer", 
  "Samsung", "Intel", "AMD", "NVIDIA", "Kingston", 
  "Crucial", "Seagate", "Western Digital", "Cisco", "Epson", "Canon", "Autre"
];

export default function FormulaireModele({
  ouvert,
  onFermer,
  onSucces,
  modeleId,
  modeleInitial,
  categorieIdDefaut,
}: FormulaireModeleProps) {
  const [etape, setEtape] = useState<1 | 2>(1);
  const [categoriesArbre, setCategoriesArbre] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Form State - Étape 1 : Infos Générales
  const [nom, setNom] = useState("");
  const [marque, setMarque] = useState("Lenovo");
  const [familleId, setFamilleId] = useState<number | null>(null);
  const [categorieId, setCategorieId] = useState<number | null>(null);
  const [sousCategorieId, setSousCategorieId] = useState<number | null>(null);
  const [prixConseille, setPrixConseille] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  // Form State - Étape 2 : Spécifications dynamiques
  const [specs, setSpecs] = useState<Record<string, any>>({});
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Charger l'arbre des catégories
  useEffect(() => {
    if (ouvert) {
      setLoadingCategories(true);
      fetch("/api/categories?tree=1")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setCategoriesArbre(data);
        })
        .catch((err) => console.error("Erreur chargement catégories:", err))
        .finally(() => setLoadingCategories(false));
    }
  }, [ouvert]);

  // Initialisation des données en mode édition ou création
  useEffect(() => {
    if (ouvert) {
      setErreur(null);
      setEtape(1);
      if (modeleInitial) {
        setNom(modeleInitial.nom || "");
        setPrixConseille(modeleInitial.prix_vente_conseille ? String(modeleInitial.prix_vente_conseille) : "");
        setImageUrl(modeleInitial.image_url || "");
        setDescription(modeleInitial.description || "");
        setSpecs(modeleInitial.attributs || {});
        
        // Retrouver la marque si possible
        const marqueTrouvee = MARQUES_FREQUENTES.find((m) =>
          modeleInitial.nom.toLowerCase().startsWith(m.toLowerCase())
        );
        if (marqueTrouvee) setMarque(marqueTrouvee);

        // Définir la catégorie
        if (modeleInitial.categorie_id) {
          setCategorieId(modeleInitial.categorie_id);
        }
      } else {
        setNom("");
        setMarque("Lenovo");
        setPrixConseille("");
        setImageUrl("");
        setDescription("");
        setSpecs({});
        if (categorieIdDefaut) {
          setCategorieId(categorieIdDefaut);
        }
      }
    }
  }, [ouvert, modeleInitial, categorieIdDefaut]);

  // Déterminer la catégorie finale sélectionnée
  const categorieFinaleId = sousCategorieId || categorieId || familleId;

  // Trouver l'objet catégorie sélectionné pour récupérer son nom
  const categorieTrouvee = useMemo(() => {
    if (!categorieFinaleId || categoriesArbre.length === 0) return null;

    for (const fam of categoriesArbre) {
      if (fam.id === categorieFinaleId) return { cat: fam, famNom: fam.nom };
      for (const cat of fam.enfants || []) {
        if (cat.id === categorieFinaleId) return { cat, famNom: fam.nom };
        for (const sub of cat.enfants || []) {
          if (sub.id === categorieFinaleId) return { cat: sub, famNom: fam.nom };
        }
      }
    }
    return null;
  }, [categorieFinaleId, categoriesArbre]);

  // Profil d'équipement dynamique déterminé par la catégorie
  const profilEquipement: ProfilEquipement | null = useMemo(() => {
    if (!categorieTrouvee) return null;
    return determinerProfilEquipement(categorieTrouvee.cat.nom, categorieTrouvee.famNom);
  }, [categorieTrouvee]);

  // Familles / Catégories dérivées pour les sélecteurs en cascade
  const familleSelectionneeObj = categoriesArbre.find((f) => f.id === familleId);
  const categoriesDisponibles = familleSelectionneeObj?.enfants || [];
  const categorieSelectionneeObj = categoriesDisponibles.find((c: any) => c.id === categorieId);
  const sousCategoriesDisponibles = categorieSelectionneeObj?.enfants || [];

  if (!ouvert) return null;

  const setSpecValeur = (cle: string, valeur: any) => {
    setSpecs((prev) => ({ ...prev, [cle]: valeur }));
  };

  const genererNomAutomatique = () => {
    const autoNom = genererDesignationAutomatique(profilEquipement, specs, marque, nom.replace(marque, "").trim());
    if (autoNom) setNom(autoNom);
  };

  const validerEtSoumettre = async () => {
    if (!nom.trim()) {
      setErreur("Le nom commercial du modèle est obligatoire.");
      setEtape(1);
      return;
    }

    if (!categorieFinaleId) {
      setErreur("Veuillez sélectionner au moins une catégorie.");
      setEtape(1);
      return;
    }

    setChargement(true);
    setErreur(null);

    const payload = {
      nom: nom.trim(),
      categorie_id: categorieFinaleId,
      attributs: specs,
      image_url: imageUrl.trim() || null,
      description: description.trim() || null,
      prix_vente_conseille: prixConseille ? Number(prixConseille) : null,
    };

    try {
      const url = modeleId ? `/api/modeles/${modeleId}` : "/api/modeles";
      const methode = modeleId ? "PUT" : "POST";

      const res = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erreur lors de l'enregistrement du modèle");
      }

      const donneesResultat = await res.json();
      onSucces(donneesResultat);
      onFermer();
    } catch (err: any) {
      setErreur(err.message || "Une erreur est survenue.");
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/40 backdrop-blur-sm animate-entree">
      <div className="relative w-full max-w-[95vw] sm:max-w-3xl max-h-[90dvh] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden text-slate-900">
        
        {/* Header de la Modale */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-orange/15 text-brand-orange shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black font-outfit text-brand-black dark:text-white">
                {modeleId ? "Modifier le Modèle Commercial" : "Nouveau Modèle de Catalogue"}
              </h2>
              <p className="text-xs text-brand-warm-grey font-medium">
                Définissez la fiche technique générique partagée par tous les exemplaires physiques
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper / Onglets interactifs */}
        <div className="flex border-b border-brand-light-grey/60 dark:border-white/10 px-4 sm:px-6 bg-brand-light-grey/5 dark:bg-white/1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setEtape(1)}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all ${
              etape === 1
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px]">
              1
            </span>
            Informations Générales & Catégorie
          </button>

          <button
            type="button"
            onClick={() => setEtape(2)}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-black border-b-2 transition-all ${
              etape === 2
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px]">
              2
            </span>
            Spécifications Techniques
            {profilEquipement && (
              <span className="text-[10px] font-bold bg-brand-orange/15 text-brand-orange px-2 py-0.5 rounded-full ml-1">
                {profilEquipement.description.split(" ")[0]}
              </span>
            )}
          </button>
        </div>

        {/* Corps du Formulaire */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {erreur && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-900 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              {erreur}
            </div>
          )}

          {/* ===================== ÉTAPE 1 : INFOS GÉNÉRALES ===================== */}
          {etape === 1 && (
            <div className="space-y-5 animate-entree">
              
              {/* Arborescence Catégories */}
              <div className="p-4 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/50 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-warm-grey">
                  <FolderTree className="w-4 h-4 text-brand-orange" />
                  Classification dans le Catalogue
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Niveau 1 : Famille */}
                  <div>
                    <label className="block text-[11px] font-bold text-brand-warm-grey mb-1">
                      1. Famille
                    </label>
                    <select
                      value={familleId || ""}
                      onChange={(e) => {
                        setFamilleId(e.target.value ? Number(e.target.value) : null);
                        setCategorieId(null);
                        setSousCategorieId(null);
                      }}
                      className="select w-full rounded-xl bg-white dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                    >
                      <option value="">Sélectionner une famille...</option>
                      {categoriesArbre.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Niveau 2 : Catégorie */}
                  <div>
                    <label className="block text-[11px] font-bold text-brand-warm-grey mb-1">
                      2. Catégorie
                    </label>
                    <select
                      value={categorieId || ""}
                      disabled={!familleId || categoriesDisponibles.length === 0}
                      onChange={(e) => {
                        setCategorieId(e.target.value ? Number(e.target.value) : null);
                        setSousCategorieId(null);
                      }}
                      className="select w-full rounded-xl bg-white dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10 disabled:opacity-40"
                    >
                      <option value="">Sélectionner une catégorie...</option>
                      {categoriesDisponibles.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Niveau 3 : Sous-Catégorie */}
                  <div>
                    <label className="block text-[11px] font-bold text-brand-warm-grey mb-1">
                      3. Sous-Catégorie (Optionnel)
                    </label>
                    <select
                      value={sousCategorieId || ""}
                      disabled={!categorieId || sousCategoriesDisponibles.length === 0}
                      onChange={(e) => setSousCategorieId(e.target.value ? Number(e.target.value) : null)}
                      className="select w-full rounded-xl bg-white dark:bg-brand-black border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10 disabled:opacity-40"
                    >
                      <option value="">Aucune sous-catégorie</option>
                      {sousCategoriesDisponibles.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sélection Rapide de la Marque */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-brand-warm-grey mb-2">
                  Constructeur / Marque
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MARQUES_FREQUENTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMarque(m);
                        if (!nom || MARQUES_FREQUENTES.some((prev) => nom.startsWith(prev))) {
                          setNom(`${m} `);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        marque === m
                          ? "bg-brand-black text-white dark:bg-white dark:text-brand-black shadow-xs scale-102"
                          : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom Commercial du Modèle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-brand-warm-grey">
                    Nom Commercial du Modèle *
                  </label>
                  {profilEquipement && (
                    <button
                      type="button"
                      onClick={genererNomAutomatique}
                      className="text-[11px] font-bold text-brand-orange flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Normaliser automatiquement
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: ThinkPad T480 Core i5 8th Gen 16Go RAM 256Go SSD..."
                  className="input w-full rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-sm font-bold h-12"
                />
              </div>

              {/* Prix de Vente Conseillé & URL Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-brand-warm-grey mb-1.5">
                    Prix de vente conseillé (DA)
                  </label>
                  <div className="relative">
                    <Coins className="w-4 h-4 text-brand-orange absolute left-3.5 top-3.5" />
                    <input
                      type="number"
                      min="0"
                      value={prixConseille}
                      onChange={(e) => setPrixConseille(e.target.value)}
                      placeholder="Ex: 45000"
                      className="input w-full pl-10 rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-bold h-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-brand-warm-grey mb-1.5">
                    Photo du Modèle (URL ou CDN)
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-brand-warm-grey absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="input w-full pl-10 rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-medium h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Description / Remarques */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-brand-warm-grey mb-1.5">
                  Description technique détaillée (Optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Points forts, compatibilité, connectique spécifique..."
                  rows={2}
                  className="textarea w-full rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-medium resize-none p-3"
                />
              </div>

            </div>
          )}

          {/* ===================== ÉTAPE 2 : SPÉCIFICATIONS TECHNIQUES ===================== */}
          {etape === 2 && (
            <div className="space-y-6 animate-entree">
              
              {!profilEquipement ? (
                <div className="p-8 text-center rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10 text-brand-warm-grey space-y-2">
                  <SlidersHorizontal className="w-8 h-8 mx-auto opacity-40 text-brand-orange" />
                  <p className="text-sm font-bold text-brand-black dark:text-white">
                    Sélectionnez d'abord une catégorie à l'étape 1
                  </p>
                  <p className="text-xs">
                    Les champs techniques spécialisés (Processeur, RAM, GPU, Puissance Watts...) s'adapteront automatiquement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEtape(1)}
                    className="btn btn-secondaire text-xs mt-2"
                  >
                    Retourner à l'Étape 1
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-brand-orange/10 border border-brand-orange/20">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-brand-orange" />
                      <div>
                        <div className="text-xs font-black text-brand-orange">
                          Profil Détecté : {profilEquipement.familleNom}
                        </div>
                        <div className="text-[11px] text-brand-warm-grey">
                          {profilEquipement.description}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={genererNomAutomatique}
                      className="btn btn-primaire text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Générer la désignation
                    </button>
                  </div>

                  {/* Grille des attributs dynamiques */}
                  <div className="space-y-5">
                    {profilEquipement.attributs.map((attr) => {
                      const valeurCourante = specs[attr.cle] || "";

                      return (
                        <div 
                          key={attr.cle}
                          className="p-4 rounded-2xl bg-white dark:bg-brand-black/40 border border-brand-light-grey/80 dark:border-white/10 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
                              {attr.label}
                              {attr.obligatoire && <span className="text-brand-orange">*</span>}
                            </label>
                            {attr.unite && (
                              <span className="text-[10px] font-bold text-brand-warm-grey font-mono bg-brand-light-grey/30 dark:bg-white/5 px-2 py-0.5 rounded">
                                {attr.unite}
                              </span>
                            )}
                          </div>

                          {/* Mode Pills (Sélection tactile rapide) */}
                          {attr.type === "pills" && attr.options && (
                            <div className="flex flex-wrap gap-1.5">
                              {attr.options.map((opt) => {
                                const estSelectionne = valeurCourante === opt.valeur;
                                return (
                                  <button
                                    key={opt.valeur}
                                    type="button"
                                    onClick={() => setSpecValeur(attr.cle, estSelectionne ? "" : opt.valeur)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                      estSelectionne
                                        ? "bg-brand-orange text-white shadow-xs scale-102 font-black"
                                        : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Mode Select */}
                          {attr.type === "select" && attr.options && (
                            <select
                              value={valeurCourante}
                              onChange={(e) => setSpecValeur(attr.cle, e.target.value)}
                              className="select w-full rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                            >
                              <option value="">Sélectionner une option...</option>
                              {attr.options.map((opt) => (
                                <option key={opt.valeur} value={opt.valeur}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Mode Texte */}
                          {attr.type === "text" && (
                            <input
                              type="text"
                              value={valeurCourante}
                              onChange={(e) => setSpecValeur(attr.cle, e.target.value)}
                              placeholder={attr.placeholder || `Saisir ${attr.label.toLowerCase()}...`}
                              className="input w-full rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                            />
                          )}

                          {/* Mode Nombre */}
                          {attr.type === "number" && (
                            <input
                              type="number"
                              value={valeurCourante}
                              onChange={(e) => setSpecValeur(attr.cle, e.target.value ? Number(e.target.value) : "")}
                              placeholder={attr.placeholder || "0"}
                              className="input w-full rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 text-xs font-bold h-10"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer d'actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/2">
          <div>
            {etape === 2 ? (
              <button
                type="button"
                onClick={() => setEtape(1)}
                className="btn btn-secondaire text-xs px-4 py-2.5 rounded-xl font-bold"
              >
                ← Étape précédente
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
            {etape === 1 ? (
              <button
                type="button"
                onClick={() => setEtape(2)}
                className="btn btn-primaire text-xs px-6 py-2.5 rounded-xl font-black shadow-xs flex items-center gap-2"
              >
                Suivant : Spécifications →
              </button>
            ) : (
              <button
                type="button"
                onClick={validerEtSoumettre}
                disabled={chargement}
                className="btn btn-primaire text-xs px-6 py-2.5 rounded-xl font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
              >
                {chargement ? (
                  <span>Enregistrement...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {modeleId ? "Enregistrer les modifications" : "Créer le modèle"}
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
