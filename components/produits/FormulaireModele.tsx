"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Coins,
  FolderTree,
  UploadCloud,
  CheckCircle2,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import {
  determinerProfilEquipement,
  genererDesignationAutomatique,
  type ProfilEquipement,
} from "@/lib/matrice-specifications";

// ─── Props ────────────────────────────────────────────────────────────────────
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

// ─── Marques principales ──────────────────────────────────────────────────────
const MARQUES = [
  "Lenovo", "HP", "Dell", "Apple", "Asus", "Acer",
  "Samsung", "Intel", "AMD", "NVIDIA", "Kingston",
  "Crucial", "Seagate", "Western Digital", "Cisco", "Epson", "Canon", "Autre",
];

// ─── Composant ────────────────────────────────────────────────────────────────
export default function FormulaireModele({
  ouvert,
  onFermer,
  onSucces,
  modeleId,
  modeleInitial,
  categorieIdDefaut,
}: FormulaireModeleProps) {
  // Catégories
  const [categoriesArbre, setCategoriesArbre] = useState<any[]>([]);
  const [familleId, setFamilleId] = useState<number | null>(null);
  const [categorieId, setCategorieId] = useState<number | null>(null);
  const [sousCategorieId, setSousCategorieId] = useState<number | null>(null);

  // Identité
  const [nom, setNom] = useState("");
  const [marque, setMarque] = useState("Lenovo");
  const [description, setDescription] = useState("");

  // Prix & Photo
  const [prixConseille, setPrixConseille] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [enGlissement, setEnGlissement] = useState(false);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  // Spécifications dynamiques
  const [specs, setSpecs] = useState<Record<string, any>>({});

  // UI
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // ─── Chargement catégories ────────────────────────────────────────────────
  useEffect(() => {
    if (!ouvert) return;
    fetch("/api/categories?tree=1")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setCategoriesArbre(d); })
      .catch(() => {});

    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [ouvert]);

  // ─── Initialisation édition / création ────────────────────────────────────
  useEffect(() => {
    if (!ouvert) return;
    setErreur(null);

    if (modeleInitial) {
      setNom(modeleInitial.nom || "");
      setImageUrl(modeleInitial.image_url || "");
      setDescription(modeleInitial.description || "");
      setSpecs(modeleInitial.attributs || {});
      setPrixConseille(modeleInitial.prix_vente_conseille ? String(modeleInitial.prix_vente_conseille) : "");

      const marqueTrouvee = MARQUES.find((m) =>
        modeleInitial.nom.toLowerCase().startsWith(m.toLowerCase())
      );
      if (marqueTrouvee) setMarque(marqueTrouvee);

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
      setFamilleId(null);
      setCategorieId(null);
      setSousCategorieId(null);
      if (categorieIdDefaut) setCategorieId(categorieIdDefaut);
    }
  }, [ouvert, modeleInitial, categorieIdDefaut]);

  // ─── Dérivées catégories ──────────────────────────────────────────────────
  const familleObj = categoriesArbre.find((f) => f.id === familleId);
  const catsDispo = familleObj?.enfants || [];
  const catObj = catsDispo.find((c: any) => c.id === categorieId);
  const sousCatsDispo = catObj?.enfants || [];

  const categorieFinaleId = sousCategorieId || categorieId || familleId;

  // Trouver nom de la catégorie pour le profil
  const categorieInfo = useMemo(() => {
    if (!categorieFinaleId || categoriesArbre.length === 0) return null;
    for (const fam of categoriesArbre) {
      if (fam.id === categorieFinaleId) return { nom: fam.nom, familleNom: fam.nom };
      for (const cat of fam.enfants || []) {
        if (cat.id === categorieFinaleId) return { nom: cat.nom, familleNom: fam.nom };
        for (const sub of cat.enfants || []) {
          if (sub.id === categorieFinaleId) return { nom: sub.nom, familleNom: fam.nom };
        }
      }
    }
    return null;
  }, [categorieFinaleId, categoriesArbre]);

  // ─── Profil équipement ────────────────────────────────────────────────────
  const profil: ProfilEquipement | null = useMemo(() => {
    if (!categorieInfo) return null;
    return determinerProfilEquipement(categorieInfo.nom, categorieInfo.familleNom);
  }, [categorieInfo]);

  // ─── Auto-resoudre familleId depuis categorieIdDefaut ─────────────────────
  useEffect(() => {
    if (!categorieId || categoriesArbre.length === 0) return;
    for (const fam of categoriesArbre) {
      for (const cat of fam.enfants || []) {
        if (cat.id === categorieId) {
          setFamilleId(fam.id);
          return;
        }
        for (const sub of cat.enfants || []) {
          if (sub.id === categorieId) {
            setFamilleId(fam.id);
            setCategorieId(cat.id);
            setSousCategorieId(sub.id);
            return;
          }
        }
      }
    }
  }, [categorieId, categoriesArbre]);

  if (!ouvert) return null;

  // ─── Upload handler ──────────────────────────────────────────────────────
  const traiterFichier = (fichier: File) => {
    if (!fichier.type.startsWith("image/")) {
      setErreur("Fichier image invalide (.jpg, .png, .webp).");
      return;
    }
    if (fichier.size > 5 * 1024 * 1024) {
      setErreur("Image trop lourde (max 5 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target?.result as string);
    reader.readAsDataURL(fichier);
  };

  // ─── Specs ───────────────────────────────────────────────────────────────
  const setSpec = (cle: string, val: any) => setSpecs((p) => ({ ...p, [cle]: val }));

  const autoNom = () => {
    const n = genererDesignationAutomatique(profil, specs, marque, nom.replace(marque, "").trim());
    if (n) setNom(n);
  };

  // ─── Soumission ──────────────────────────────────────────────────────────
  const soumettre = async () => {
    if (!nom.trim()) { setErreur("Le nom du modèle est obligatoire."); return; }
    if (!categorieFinaleId) { setErreur("Sélectionnez une catégorie."); return; }

    setChargement(true);
    setErreur(null);

    try {
      const res = await fetch(
        modeleId ? `/api/modeles/${modeleId}` : "/api/modeles",
        {
          method: modeleId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: nom.trim(),
            categorie_id: categorieFinaleId,
            attributs: specs,
            image_url: imageUrl.trim() || null,
            description: description.trim() || null,
            prix_vente_conseille: prixConseille ? Number(prixConseille) : null,
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erreur lors de l'enregistrement");
      }

      const donnees = await res.json();
      onSucces(donnees);
      onFermer();
    } catch (err: any) {
      setErreur(err.message || "Une erreur est survenue.");
    } finally {
      setChargement(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDU
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-entree">
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-white dark:bg-brand-paper sm:rounded-3xl rounded-t-3xl border border-brand-light-grey dark:border-white/10 shadow-2xl overflow-hidden text-brand-black dark:text-white">

        {/* ─── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-light-grey/60 dark:border-white/10">
          <h2 className="text-base font-black font-outfit">
            {modeleId ? "Modifier le Modèle" : "Nouveau Modèle"}
          </h2>
          <button
            onClick={onFermer}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Corps scrollable ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-fine">

          {/* Erreur */}
          {erreur && (
            <div className="rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold p-3 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              {erreur}
            </div>
          )}

          {/* ═══ SECTION: Catégorie ═══════════════════════════════════════ */}
          <fieldset className="space-y-3">
            <legend className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
              <FolderTree className="w-4 h-4" />
              Catégorie
            </legend>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={familleId || ""}
                onChange={(e) => {
                  setFamilleId(e.target.value ? Number(e.target.value) : null);
                  setCategorieId(null);
                  setSousCategorieId(null);
                }}
                className="champ text-sm"
              >
                <option value="">Famille…</option>
                {categoriesArbre.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>

              <select
                value={categorieId || ""}
                disabled={!familleId}
                onChange={(e) => {
                  setCategorieId(e.target.value ? Number(e.target.value) : null);
                  setSousCategorieId(null);
                }}
                className="champ text-sm"
              >
                <option value="">Catégorie…</option>
                {catsDispo.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>

              <select
                value={sousCategorieId || ""}
                disabled={!categorieId || sousCatsDispo.length === 0}
                onChange={(e) => setSousCategorieId(e.target.value ? Number(e.target.value) : null)}
                className="champ text-sm"
              >
                <option value="">Sous-catégorie…</option>
                {sousCatsDispo.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
          </fieldset>

          {/* ═══ SECTION: Identité ═══════════════════════════════════════ */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
              Identité
            </legend>

            {/* Marque — chips compactes */}
            <div>
              <label className="text-[11px] font-bold text-brand-warm-grey mb-1.5 block">Marque</label>
              <div className="flex flex-wrap gap-1.5">
                {MARQUES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMarque(m);
                      if (!nom || MARQUES.some((prev) => nom.startsWith(prev))) {
                        setNom(`${m} `);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      marque === m
                        ? "bg-brand-orange text-white shadow-sm"
                        : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Nom */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-brand-warm-grey">Nom du modèle *</label>
                {profil && (
                  <button type="button" onClick={autoNom} className="text-[11px] font-bold text-brand-orange hover:underline">
                    Auto-générer
                  </button>
                )}
              </div>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: ThinkPad T480 Core i5 16Go 256Go SSD"
                className="champ h-11 font-bold"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-bold text-brand-warm-grey mb-1 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Points forts, compatibilité…"
                rows={2}
                className="champ resize-none text-sm"
              />
            </div>
          </fieldset>

          {/* ═══ SECTION: Prix & Photo ═══════════════════════════════════ */}
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-brand-warm-grey block">Prix conseillé (DA)</label>
              <div className="relative">
                <Coins className="w-4 h-4 text-brand-warm-grey absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  value={prixConseille}
                  onChange={(e) => setPrixConseille(e.target.value)}
                  placeholder="45 000"
                  className="champ pl-9 h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-brand-warm-grey block">Photo</label>
              {imageUrl ? (
                <div className="relative rounded-2xl border border-brand-light-grey dark:border-white/10 p-2 flex items-center gap-3">
                  <img
                    src={imageUrl}
                    alt="Aperçu"
                    className="w-12 h-12 rounded-xl object-cover bg-white dark:bg-white/5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">Photo chargée</p>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => inputFichierRef.current?.click()}
                        className="text-[11px] font-bold text-brand-orange hover:underline"
                      >
                        Remplacer
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="text-[11px] font-bold text-red-500 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setEnGlissement(true); }}
                  onDragLeave={() => setEnGlissement(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setEnGlissement(false);
                    if (e.dataTransfer.files?.[0]) traiterFichier(e.dataTransfer.files[0]);
                  }}
                  onClick={() => inputFichierRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    enGlissement
                      ? "border-brand-orange bg-brand-orange/10"
                      : "border-brand-light-grey dark:border-white/15 hover:border-brand-orange/50"
                  }`}
                >
                  <UploadCloud className="w-5 h-5 mx-auto text-brand-warm-grey mb-1" />
                  <p className="text-[11px] font-bold">
                    Glisser ou <span className="text-brand-orange underline">parcourir</span>
                  </p>
                </div>
              )}
              <input
                ref={inputFichierRef}
                type="file"
                accept="image/*"
                onChange={(e) => { if (e.target.files?.[0]) traiterFichier(e.target.files[0]); }}
                className="hidden"
              />
            </div>
          </fieldset>

          {/* ═══ SECTION: Spécifications techniques ══════════════════════ */}
          {profil && (
            <fieldset className="space-y-3">
              <legend className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                <SlidersHorizontal className="w-4 h-4" />
                Spécifications — {profil.familleNom}
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profil.attributs.map((attr) => {
                  const val = specs[attr.cle] || "";
                  return (
                    <div
                      key={attr.cle}
                      className="rounded-xl border border-brand-light-grey/50 dark:border-white/10 bg-brand-paper/30 dark:bg-white/[0.02] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-brand-warm-grey">
                          {attr.label}
                          {attr.obligatoire && <span className="text-brand-orange ml-0.5">*</span>}
                        </label>
                        {attr.unite && (
                          <span className="text-[10px] font-mono font-bold text-brand-warm-grey bg-brand-light-grey/30 dark:bg-white/5 px-1.5 py-0.5 rounded">
                            {attr.unite}
                          </span>
                        )}
                      </div>

                      {attr.type === "pills" && attr.options && (
                        <div className="flex flex-wrap gap-1">
                          {attr.options.map((opt) => (
                            <button
                              key={opt.valeur}
                              type="button"
                              onClick={() => setSpec(attr.cle, val === opt.valeur ? "" : opt.valeur)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                val === opt.valeur
                                  ? "bg-brand-orange text-white"
                                  : "bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {attr.type === "select" && attr.options && (
                        <select
                          value={val}
                          onChange={(e) => setSpec(attr.cle, e.target.value)}
                          className="champ text-sm"
                        >
                          <option value="">Choisir…</option>
                          {attr.options.map((opt) => (
                            <option key={opt.valeur} value={opt.valeur}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {attr.type === "text" && (
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => setSpec(attr.cle, e.target.value)}
                          placeholder={attr.placeholder || attr.label}
                          className="champ text-sm"
                        />
                      )}

                      {attr.type === "number" && (
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => setSpec(attr.cle, e.target.value ? Number(e.target.value) : "")}
                          placeholder={attr.placeholder || "0"}
                          className="champ text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Message si pas de profil */}
          {!profil && categorieFinaleId && (
            <div className="text-center py-4 text-xs text-brand-warm-grey font-medium">
              Aucun profil technique pour cette catégorie.
            </div>
          )}
        </div>

        {/* ─── Footer ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-brand-light-grey/60 dark:border-white/10 bg-brand-paper/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-secondaire px-4 py-2 rounded-xl text-sm font-bold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={soumettre}
            disabled={chargement}
            className="btn btn-primaire px-5 py-2 rounded-xl text-sm font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
          >
            {chargement ? (
              "Enregistrement…"
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {modeleId ? "Enregistrer" : "Créer"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
