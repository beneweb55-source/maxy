"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Package,
  Plus,
  X,
  Check,
  Scan,
  Archive,
  Eye,
  AlertCircle,
} from "lucide-react";
import type { CategorieNoeud } from "./types";
import Modale from "@/components/Modale";
import ChampPhotos from "@/components/ChampPhotos";
import { useToast } from "@/components/toast";

/* ────────────────────────── Types ────────────────────────── */

interface LotDisponible {
  id: number;
  libelle: string;
}

interface FormulaireAjoutUnifieProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces: () => void;
  categoriesTree: CategorieNoeud[];
  lotsDisponibles?: LotDisponible[];
}

/* ────────────────────────── Marques populaires ────────────────────────── */

const MARQUES_POPULAIRES = [
  "Lenovo",
  "HP",
  "Dell",
  "Apple",
  "Samsung",
  "ASUS",
  "Acer",
  "MSI",
  "Toshiba",
  "Sony",
  "LG",
  "Huawei",
  "Xiaomi",
  "Canon",
  "Epson",
  "Brother",
];

/* ────────────────────────── Constantes ────────────────────────── */

const GRADES = [
  { valeur: "Neuf", label: "Neuf" },
  { valeur: "Très bon état", label: "Très bon état" },
  { valeur: "Bon état", label: "Bon état" },
  { valeur: "Usé", label: "Usé" },
  { valeur: "Pour pièces", label: "Pour pièces" },
];

type EmplacementType = "reserve" | "vitrine";

interface Formulaire {
  reference: string;
  categorie_id: string;
  marque: string;
  prix_vente_conseille: string;
  quantite: string;
  prix_achat: string;
  grade: string;
  emplacement: EmplacementType;
  numeros_serie: string[];
  snInput: string;
  lot_id: string;
  garderOuvert: boolean;
}

const FORMULAIRE_VIDE: Formulaire = {
  reference: "",
  categorie_id: "",
  marque: "",
  prix_vente_conseille: "",
  quantite: "1",
  prix_achat: "",
  grade: "",
  emplacement: "reserve",
  numeros_serie: [],
  snInput: "",
  lot_id: "",
  garderOuvert: false,
};

/* ────────────────────────── Aplatir l'arborescence catégories ────────────────────────── */

interface CategoriePlat {
  id: number;
  nom: string;
  chemin: string;
}

function aplatirCategories(tree: CategorieNoeud[]): CategoriePlat[] {
  const result: CategoriePlat[] = [];
  for (const famille of tree) {
    for (const categorie of famille.enfants ?? []) {
      for (const sous of categorie.enfants ?? []) {
        result.push({ id: sous.id, nom: sous.nom, chemin: `${famille.nom} › ${categorie.nom} › ${sous.nom}` });
      }
      if ((categorie.enfants ?? []).length === 0) {
        result.push({ id: categorie.id, nom: categorie.nom, chemin: `${famille.nom} › ${categorie.nom}` });
      }
    }
    if ((famille.enfants ?? []).length === 0) {
      result.push({ id: famille.id, nom: famille.nom, chemin: famille.nom });
    }
  }
  return result;
}

/* ══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════════════ */

export default function FormulaireAjoutUnifie({
  ouvert,
  onFermer,
  onSucces,
  categoriesTree,
  lotsDisponibles = [],
}: FormulaireAjoutUnifieProps) {
  const { afficher } = useToast();
  const refInput = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);

  const [formulaire, setFormulaire] = useState<Formulaire>(FORMULAIRE_VIDE);
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const categories = aplatirCategories(categoriesTree);

  /* ── Focus auto sur le champ référence à l'ouverture ── */
  useEffect(() => {
    if (ouvert) {
      const timer = setTimeout(() => refInput.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [ouvert]);

  /* ── Helpers ── */
  const maj = useCallback(
    <K extends keyof Formulaire>(cle: K, valeur: Formulaire[K]) => {
      setFormulaire((f) => ({ ...f, [cle]: valeur }));
      if (erreur) setErreur(null);
    },
    [erreur],
  );

  const ajouterNumeroSerie = useCallback(
    (sn?: string) => {
      const texte = (sn ?? formulaire.snInput).trim();
      if (!texte) return;
      if (formulaire.numeros_serie.includes(texte)) {
        setErreur(`"${texte}" est déjà dans la liste.`);
        return;
      }
      setErreur(null);
      setFormulaire((f) => {
        const nouveaux = [...f.numeros_serie, texte];
        // Ajuster la quantité si besoin
        const quantiteNum = Number(f.quantite) || 0;
        return {
          ...f,
          numeros_serie: nouveaux,
          snInput: "",
          quantite: String(Math.max(quantiteNum, nouveaux.length)),
        };
      });
      // Re-focus le champ scan
      setTimeout(() => scanRef.current?.focus(), 0);
    },
    [formulaire.snInput, formulaire.numeros_serie, formulaire.quantite],
  );

  const supprimerNumeroSerie = useCallback((index: number) => {
    setFormulaire((f) => {
      const nouveaux = f.numeros_serie.filter((_, i) => i !== index);
      const quantiteNum = Number(f.quantite) || 0;
      return {
        ...f,
        numeros_serie: nouveaux,
        quantite: String(Math.max(1, Math.min(quantiteNum, nouveaux.length || 1))),
      };
    });
  }, []);

  /* ── Réinitialisation ── */
  const reinitialiser = useCallback(() => {
    const garder = formulaire.garderOuvert;
    setFormulaire({ ...FORMULAIRE_VIDE, garderOuvert: garder });
    setPhotos([]);
    setErreur(null);
    setTimeout(() => refInput.current?.focus(), 100);
  }, [formulaire.garderOuvert]);

  /* ── Soumission ── */
  const soumettre = useCallback(async () => {
    setErreur(null);

    // Validation rapide
    if (!formulaire.reference.trim()) {
      setErreur("La référence / désignation est obligatoire.");
      return;
    }
    if (!formulaire.categorie_id) {
      setErreur("Veuillez sélectionner une catégorie.");
      return;
    }
    if (!formulaire.prix_achat) {
      setErreur("Le prix d'achat est obligatoire.");
      return;
    }
    const prixAchat = Number(formulaire.prix_achat);
    if (!Number.isFinite(prixAchat) || prixAchat < 0) {
      setErreur("Le prix d'achat doit être un nombre positif.");
      return;
    }

    setEnvoi(true);
    try {
      // 1. Créer le modèle
      const resModele = await fetch("/api/modeles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formulaire.reference.trim(),
          categorie_id: Number(formulaire.categorie_id),
          attributs: { marque: formulaire.marque || undefined },
          prix_vente_conseille: Number(formulaire.prix_vente_conseille) || null,
          image_url: photos[0] || null,
        }),
      });

      if (!resModele.ok) {
        const errData = await resModele.json();
        // Si le modèle existe déjà, on le récupère par recherche
        if (errData.error?.includes("existe déjà")) {
          const resSearch = await fetch(
            `/api/modeles?q=${encodeURIComponent(formulaire.reference.trim())}&categorie_id=${formulaire.categorie_id}`,
          );
          const dataSearch = await resSearch.json();
          if (Array.isArray(dataSearch) && dataSearch.length > 0) {
            var modeleId = dataSearch[0].id;
          } else {
            throw new Error(errData.error);
          }
        } else {
          throw new Error(errData.error || "Erreur création modèle.");
        }
      } else {
        var modeleData = await resModele.json();
        var modeleId = modeleData.id;
      }

      // 2. Créer les exemplaires physiques
      const resExemplaires = await fetch(`/api/modeles/${modeleId}/exemplaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantite: Number(formulaire.quantite) || 1,
          prix_achat: prixAchat,
          prix_vente_fixe: Number(formulaire.prix_vente_conseille) || null,
          lot_id: formulaire.lot_id ? Number(formulaire.lot_id) : null,
          grade: formulaire.grade || null,
          emplacement: formulaire.emplacement,
          numeros_serie: formulaire.numeros_serie,
          en_vitrine: formulaire.emplacement === "vitrine",
        }),
      });

      if (!resExemplaires.ok) {
        const errData = await resExemplaires.json();
        throw new Error(errData.error || "Erreur création exemplaires.");
      }

      afficher("Produit ajouté avec succès !", "succes");

      if (formulaire.garderOuvert) {
        reinitialiser();
      } else {
        onFermer();
        onSucces();
      }
    } catch (err: any) {
      setErreur(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setEnvoi(false);
    }
  }, [formulaire, photos, onFermer, onSucces, afficher, reinitialiser]);

  /* ── Rendu ── */
  if (!ouvert) return null;

  const submitDisabled =
    envoi ||
    !formulaire.reference.trim() ||
    !formulaire.categorie_id ||
    !formulaire.prix_achat;

  return (
    <Modale titre="Ajouter un produit" ouverte={ouvert} onFermer={onFermer} large="2xl">
      <div className="space-y-6">
        {/* ── Erreur ── */}
        {erreur && (
          <div className="rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold p-3 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        {/* ── Colonnes 2 sur desktop ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          {/* ═══════════════ COLONNE GAUCHE — IDENTITÉ ═══════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                Identité
              </span>
              <div className="flex-1 h-px bg-brand-light-grey dark:bg-white/10" />
            </div>

            {/* Référence / Désignation */}
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-ref"
              >
                Référence / Désignation <span className="text-brand-orange">*</span>
              </label>
              <input
                ref={refInput}
                id="uf-ref"
                type="text"
                value={formulaire.reference}
                onChange={(e) => maj("reference", e.target.value)}
                placeholder="Ex. ThinkPad T480 i5 8Go 256Go SSD"
                className="champ"
                autoComplete="off"
              />
            </div>

            {/* Catégorie */}
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-categorie"
              >
                Catégorie <span className="text-brand-orange">*</span>
              </label>
              <select
                id="uf-categorie"
                value={formulaire.categorie_id}
                onChange={(e) => maj("categorie_id", e.target.value)}
                className="champ"
              >
                <option value="">Sélectionner…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.chemin}
                  </option>
                ))}
                {categories.length === 0 && (
                  <option value="" disabled>
                    Aucune catégorie disponible
                  </option>
                )}
              </select>
            </div>

            {/* Marque */}
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-marque"
              >
                Marque
              </label>
              <input
                id="uf-marque"
                type="text"
                value={formulaire.marque}
                onChange={(e) => maj("marque", e.target.value)}
                placeholder="Saisissez ou choisissez…"
                className="champ"
                autoComplete="off"
              />
              {/* Chips marques populaires */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {MARQUES_POPULAIRES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => maj("marque", formulaire.marque === m ? "" : m)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                      formulaire.marque === m
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-orange/60"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Prix de vente */}
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-prix-vente"
              >
                Prix de vente (DA)
              </label>
              <div className="relative">
                <input
                  id="uf-prix-vente"
                  type="number"
                  min={0}
                  value={formulaire.prix_vente_conseille}
                  onChange={(e) => maj("prix_vente_conseille", e.target.value)}
                  placeholder="ex: 45 000"
                  className="champ pr-12"
                />
                <span className="absolute right-4 top-3 text-xs font-black text-brand-warm-grey pointer-events-none">
                  DA
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════ COLONNE DROITE — STOCK ═══════════════ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
                Stock
              </span>
              <div className="flex-1 h-px bg-brand-light-grey dark:bg-white/10" />
            </div>

            {/* Quantité */}
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-quantite"
              >
                Quantité
              </label>
              <input
                id="uf-quantite"
                type="number"
                min={1}
                value={formulaire.quantite}
                onChange={(e) =>
                  maj("quantite", String(Math.max(1, Number(e.target.value) || 1)))
                }
                className="champ text-right font-black"
              />
            </div>

            {/* Prix d'achat */}
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-prix-achat"
              >
                Prix d&apos;achat (DA) <span className="text-brand-orange">*</span>
              </label>
              <div className="relative">
                <input
                  id="uf-prix-achat"
                  type="number"
                  min={0}
                  value={formulaire.prix_achat}
                  onChange={(e) => maj("prix_achat", e.target.value)}
                  placeholder="ex: 15 000"
                  className="champ pr-12"
                />
                <span className="absolute right-4 top-3 text-xs font-black text-brand-warm-grey pointer-events-none">
                  DA
                </span>
              </div>
            </div>

            {/* Grade / État */}
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-grade"
              >
                Grade / État
              </label>
              <select
                id="uf-grade"
                value={formulaire.grade}
                onChange={(e) => maj("grade", e.target.value)}
                className="champ"
              >
                <option value="">Sélectionner…</option>
                {GRADES.map((g) => (
                  <option key={g.valeur} value={g.valeur}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Emplacement — Toggle pill */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
                Emplacement
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => maj("emplacement", "reserve")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    formulaire.emplacement === "reserve"
                      ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                      : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" /> Réserve
                </button>
                <button
                  type="button"
                  onClick={() => maj("emplacement", "vitrine")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    formulaire.emplacement === "vitrine"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Vitrine
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════ PLEINE LARGEUR — OPTIONS ═══════════════ */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
              Options
            </span>
            <div className="flex-1 h-px bg-brand-light-grey dark:bg-white/10" />
          </div>

          {/* ── Scan S/N ── */}
          <div className="p-4 rounded-2xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4 text-brand-orange" />
                <span className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white">
                  Numéros de série (S/N)
                </span>
              </div>
              {formulaire.numeros_serie.length > 0 && (
                <span className="text-xs font-black text-brand-orange">
                  {formulaire.numeros_serie.length} scanné{formulaire.numeros_serie.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                ref={scanRef}
                type="text"
                value={formulaire.snInput}
                onChange={(e) => maj("snInput", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    ajouterNumeroSerie();
                  }
                }}
                placeholder="Scanner ou saisir un N° de série"
                className="champ flex-1 font-mono"
              />
              <button
                type="button"
                onClick={() => ajouterNumeroSerie()}
                className="btn btn-primaire px-4 rounded-xl text-xs font-bold shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {formulaire.numeros_serie.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
                {formulaire.numeros_serie.map((sn, i) => (
                  <span
                    key={`${sn}-${i}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 shadow-xs"
                  >
                    <span className="text-brand-warm-grey">#{i + 1}</span>
                    <span>{sn}</span>
                    <button
                      type="button"
                      onClick={() => supprimerNumeroSerie(i)}
                      className="text-brand-warm-grey hover:text-danger ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <p className="text-[11px] text-brand-warm-grey">
              Si aucun S/N n&apos;est scanné, les produits seront créés sans numéro de série.
            </p>
          </div>

          {/* ── Photos ── */}
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Photos
            </label>
            <ChampPhotos photos={photos} onChange={setPhotos} />
          </div>

          {/* ── Lot d'arrivage ── */}
          {lotsDisponibles.length > 0 && (
            <div>
              <label
                className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block"
                htmlFor="uf-lot"
              >
                Lot d&apos;arrivage
              </label>
              <select
                id="uf-lot"
                value={formulaire.lot_id}
                onChange={(e) => maj("lot_id", e.target.value)}
                className="champ"
              >
                <option value="">Hors-lot (Arrivage direct)</option>
                {lotsDisponibles.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.libelle}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ═══════════════ FOOTER ═══════════════ */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-brand-light-grey/40 dark:border-white/10">
          {/* Garder ouvert */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formulaire.garderOuvert}
              onChange={(e) => maj("garderOuvert", e.target.checked)}
              className="checkbox checkbox-sm checkbox-primary rounded-md"
            />
            <span className="text-xs font-bold text-brand-black dark:text-white">
              Garder ouvert
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFermer}
              disabled={envoi}
              className="btn btn-secondaire text-xs py-2.5 px-5 rounded-2xl font-bold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={soumettre}
              disabled={submitDisabled}
              className="btn btn-primaire text-xs py-2.5 px-6 rounded-2xl font-black shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {envoi ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement…
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Ajouter le produit
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modale>
  );
}
