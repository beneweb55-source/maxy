"use client";

import React, { useState, useMemo } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import type { CategorieNoeud } from "./types";

interface NouveauComposantInlineProps {
  categoriesTree: CategorieNoeud[];
  onCree: (composant: any) => void;
  onAnnuler: () => void;
}

export default function NouveauComposantInline({
  categoriesTree,
  onCree,
  onAnnuler,
}: NouveauComposantInlineProps) {
  const [reference, setReference] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const categories = useMemo(() => {
    const result: { id: number; nom: string; chemin: string }[] = [];
    for (const famille of categoriesTree) {
      for (const categorie of famille.enfants ?? []) {
        for (const sous of categorie.enfants ?? []) {
          result.push({
            id: sous.id,
            nom: sous.nom,
            chemin: `${famille.nom} > ${categorie.nom} > ${sous.nom}`,
          });
        }
        if ((categorie.enfants ?? []).length === 0) {
          result.push({
            id: categorie.id,
            nom: categorie.nom,
            chemin: `${famille.nom} > ${categorie.nom}`,
          });
        }
      }
      if ((famille.enfants ?? []).length === 0) {
        result.push({ id: famille.id, nom: famille.nom, chemin: famille.nom });
      }
    }
    return result;
  }, [categoriesTree]);

  const valider = async () => {
    setErreur(null);
    if (!reference.trim()) return setErreur("La référence est obligatoire.");
    if (!categorieId) return setErreur("Veuillez sélectionner une catégorie.");
    if (!prixAchat || Number(prixAchat) < 0) return setErreur("Prix d'achat invalide.");

    setEnvoi(true);
    try {
      // 1. Créer le modèle
      const resModele = await fetch("/api/modeles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: reference.trim(),
          categorie_id: Number(categorieId),
        }),
      });

      let modeleId: number;
      if (resModele.ok) {
        const data = await resModele.json();
        modeleId = data.id;
      } else {
        const errData = await resModele.json();
        if (errData.error?.includes("existe déjà")) {
          const resSearch = await fetch(`/api/modeles?q=${encodeURIComponent(reference.trim())}&categorie_id=${categorieId}`);
          const dataSearch = await resSearch.json();
          if (Array.isArray(dataSearch) && dataSearch.length > 0) {
            modeleId = dataSearch[0].id;
          } else {
            throw new Error("Modèle introuvable après collision.");
          }
        } else {
          throw new Error(errData.error || "Erreur création modèle.");
        }
      }

      // 2. Créer l'exemplaire physique
      const sn = numeroSerie.trim();
      const resExemplaires = await fetch(`/api/modeles/${modeleId}/exemplaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantite: 1,
          prix_achat: Number(prixAchat),
          prix_vente_fixe: null,
          lot_id: null,
          grade: null,
          emplacement: "reserve",
          numeros_serie: sn ? [sn] : [],
          en_vitrine: false,
          bom_role: "component",
          est_compose: false,
        }),
      });

      if (!resExemplaires.ok) {
        const errData = await resExemplaires.json();
        throw new Error(errData.error || "Erreur création exemplaire.");
      }

      const exemplairesData = await resExemplaires.json();
      const codeInterne = exemplairesData.codes[0];

      const resSearchProd = await fetch(`/api/produits?code_exact=${encodeURIComponent(codeInterne)}`);
      const searchData = await resSearchProd.json();
      const produit = searchData?.produits?.[0];

      if (!produit?.id) {
        throw new Error("Produit non trouvé après création");
      }

      onCree({
        id: produit.id,
        code_interne: produit.code_interne,
        reference: produit.reference,
        categorie: produit.categorie,
        numero_serie: produit.numero_serie,
        prix_achat: produit.prix_achat,
        quantite: 1,
      });
    } catch (err: any) {
      setErreur(err.message || "Erreur inattendue.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/50 space-y-3 mt-3 animate-entree">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase text-brand-black dark:text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-orange" /> Créer un composant
        </h4>
        <button type="button" onClick={onAnnuler} className="text-brand-warm-grey hover:text-danger">
          <X className="w-4 h-4" />
        </button>
      </div>

      {erreur && (
        <div className="p-2 rounded-lg bg-danger/10 text-danger text-[11px] font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-extrabold uppercase text-brand-warm-grey mb-1 block">Référence *</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ex: RAM 16GB DDR4"
            className="champ text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-extrabold uppercase text-brand-warm-grey mb-1 block">Catégorie *</label>
          <select value={categorieId} onChange={(e) => setCategorieId(e.target.value)} className="champ text-xs">
            <option value="">Sélectionner...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.chemin}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-extrabold uppercase text-brand-warm-grey mb-1 block">Prix Achat (DA) *</label>
          <input
            type="number"
            value={prixAchat}
            onChange={(e) => setPrixAchat(e.target.value)}
            placeholder="Ex: 5000"
            className="champ text-xs pr-8"
          />
        </div>
        <div>
          <label className="text-[10px] font-extrabold uppercase text-brand-warm-grey mb-1 block">S/N (Optionnel)</label>
          <input
            type="text"
            value={numeroSerie}
            onChange={(e) => setNumeroSerie(e.target.value)}
            placeholder="Numéro de série"
            className="champ text-xs font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={valider}
          disabled={envoi}
          className="btn btn-primaire text-[11px] px-4 py-2 font-bold"
        >
          {envoi ? "Création..." : "Créer et Attacher"}
        </button>
      </div>
    </div>
  );
}
