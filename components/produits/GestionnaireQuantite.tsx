"use client";

import React, { useState } from "react";
import { Plus, Minus, Loader2, Package } from "lucide-react";
import { useToast } from "@/components/toast";

interface GestionnaireQuantiteProps {
  produitId: number;
  modeleId?: number | null;
  quantiteActuelle: number;
  unitesIds?: number[];
  peutModifier?: boolean;
  onChangement?: (nouvelleQuantite: number) => void;
  className?: string;
  taille?: "sm" | "md" | "lg";
}

export default function GestionnaireQuantite({
  produitId,
  modeleId,
  quantiteActuelle,
  unitesIds = [],
  peutModifier = true,
  onChangement,
  className = "",
  taille = "md",
}: GestionnaireQuantiteProps) {
  const { afficher } = useToast();
  const [enCours, setEnCours] = useState(false);
  const [quantiteLocale, setQuantiteLocale] = useState(quantiteActuelle);

  // Synchroniser la quantité locale avec les props
  React.useEffect(() => {
    setQuantiteLocale(quantiteActuelle);
  }, [quantiteActuelle]);

  const modifierQuantite = async (delta: number) => {
    if (!peutModifier || enCours) return;
    const nouvelleQuantite = quantiteLocale + delta;
    if (nouvelleQuantite < 1) {
      afficher("La quantité minimale est de 1 exemplaire.", "erreur");
      return;
    }

    setEnCours(true);
    try {
      const idsEffectifs = unitesIds.length > 0 ? unitesIds : [produitId];

      if (delta > 0 && modeleId) {
        // Ajouter un exemplaire via l'API dédiée au modèle
        const res = await fetch(`/api/modeles/${modeleId}/exemplaires`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantite: delta }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de l'ajout d'exemplaire.");
        }

        afficher(`+${delta} exemplaire(s) ajouté(s) au stock.`, "succes");
      } else {
        // Ajuster la quantité globale via l'API masse/edition
        const res = await fetch(`/api/produits/masse/edition`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: idsEffectifs,
            quantite: nouvelleQuantite,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de la modification de quantité.");
        }

        afficher(
          delta > 0
            ? `Stock augmenté à ${nouvelleQuantite} unités.`
            : `Stock réduit à ${nouvelleQuantite} unités.`,
          "succes"
        );
      }

      setQuantiteLocale(nouvelleQuantite);
      if (onChangement) {
        onChangement(nouvelleQuantite);
      }
    } catch (err: any) {
      afficher(err.message || "Erreur lors de l'ajustement du stock.", "erreur");
    } finally {
      setEnCours(false);
    }
  };

  const tailleClasses = {
    sm: "h-7 text-xs px-2 gap-1",
    md: "h-9 text-xs px-2.5 gap-1.5",
    lg: "h-10 text-sm px-3 gap-2",
  }[taille];

  const boutonTaille = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7",
  }[taille];

  const iconeTaille = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  }[taille];

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={`inline-flex items-center rounded-xl bg-slate-100 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/80 p-0.5 select-none font-outfit shadow-2xs ${tailleClasses} ${className}`}
    >
      {/* Bouton Moins (-) */}
      {peutModifier && (
        <button
          type="button"
          disabled={enCours || quantiteLocale <= 1}
          onClick={() => modifierQuantite(-1)}
          className={`${boutonTaille} flex items-center justify-center rounded-lg bg-white dark:bg-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-600 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-700 transition-all active:scale-90 shadow-2xs cursor-pointer`}
          title="Diminuer la quantité (-1)"
        >
          {enCours ? <Loader2 className={`${iconeTaille} animate-spin text-slate-400`} /> : <Minus className={iconeTaille} />}
        </button>
      )}

      {/* Affichage & Saisie Directe Quantité */}
      <div className="flex items-center gap-0.5 px-1 font-black text-slate-900 dark:text-white">
        <Package className="w-3.5 h-3.5 text-brand-orange shrink-0" />
        <input
          type="number"
          min={1}
          value={quantiteLocale}
          disabled={enCours || !peutModifier}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 1) {
              setQuantiteLocale(val);
            }
          }}
          onBlur={() => {
            const delta = quantiteLocale - quantiteActuelle;
            if (delta !== 0) {
              void modifierQuantite(delta);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-10 h-6 text-center font-mono font-black text-xs bg-transparent border-0 focus:ring-1 focus:ring-brand-orange text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          title="Saisir la quantité directement (Entrée pour valider)"
        />
        <span className="text-[10px] font-bold text-slate-400 uppercase">u.</span>
      </div>

      {/* Bouton Plus (+) */}
      {peutModifier && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => modifierQuantite(1)}
          className={`${boutonTaille} flex items-center justify-center rounded-lg bg-brand-orange text-white hover:bg-brand-orange/90 disabled:opacity-40 transition-all active:scale-90 shadow-2xs cursor-pointer`}
          title="Augmenter la quantité (+1)"
        >
          {enCours ? <Loader2 className={`${iconeTaille} animate-spin text-white`} /> : <Plus className={iconeTaille} />}
        </button>
      )}
    </div>
  );
}
