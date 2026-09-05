"use client";

import React, { useState, useEffect } from "react";
import { Plus, Minus, Loader2, Package } from "lucide-react";
import { useToast } from "@/components/toast";
import { actionSetStockQuantity, actionAdjustStock } from "@/actions/stock";

interface GestionnaireQuantiteProps {
  produitId?: number;
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
  useEffect(() => {
    setQuantiteLocale(quantiteActuelle);
  }, [quantiteActuelle]);

  /**
   * Applique directement une nouvelle quantité cible via le Service Métier Stock.
   */
  const validerNouvelleQuantite = async (cible: number) => {
    if (!peutModifier || enCours) return;
    const nouvelle = Math.max(0, Math.floor(cible));

    if (nouvelle === quantiteActuelle) {
      setQuantiteLocale(quantiteActuelle);
      return;
    }

    setEnCours(true);
    try {
      if (modeleId) {
        // Utiliser la Server Action de synchronisation magique
        const res = await actionSetStockQuantity(modeleId, nouvelle);
        if (!res.succes || !res.donnees) {
          throw new Error(res.erreur || "Erreur lors de la mise à jour de la quantité.");
        }

        const msg =
          res.donnees.diff > 0
            ? `Stock augmenté à ${nouvelle} (+${res.donnees.diff} exemplaire(s) généré(s)).`
            : `Stock réduit à ${nouvelle} (${Math.abs(res.donnees.diff)} exemplaire(s) retiré(s)).`;

        afficher(msg, "succes");
        setQuantiteLocale(nouvelle);
        if (onChangement) onChangement(nouvelle);
      } else {
        // Fallback pour les produits sans modèle ID via /api/produits/masse/edition
        const idsEffectifs = unitesIds.length > 0 ? unitesIds : produitId ? [produitId] : [];
        if (idsEffectifs.length === 0) {
          throw new Error("Aucun identifiant d'exemplaire ciblé.");
        }

        const res = await fetch(`/api/produits/masse/edition`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: idsEffectifs,
            quantite: nouvelle,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de la modification de quantité.");
        }

        afficher(
          nouvelle > quantiteActuelle
            ? `Stock augmenté à ${nouvelle} unités.`
            : `Stock réduit à ${nouvelle} unités.`,
          "succes"
        );
        setQuantiteLocale(nouvelle);
        if (onChangement) onChangement(nouvelle);
      }
    } catch (err: any) {
      afficher(err.message || "Erreur lors de l'ajustement du stock.", "erreur");
      // Rollback visuel en cas d'échec
      setQuantiteLocale(quantiteActuelle);
    } finally {
      setEnCours(false);
    }
  };

  const ajusterDelta = async (delta: number) => {
    const cible = quantiteLocale + delta;
    if (cible < 0) return;
    await validerNouvelleQuantite(cible);
  };

  const tailleClasses = {
    sm: "h-7 text-xs px-1.5 gap-1",
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
      className={`inline-flex items-center rounded-xl bg-brand-light-grey/60 dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 p-0.5 select-none font-outfit shadow-2xs ${tailleClasses} ${className}`}
    >
      {/* Bouton Moins (-) */}
      {peutModifier && (
        <button
          type="button"
          disabled={enCours || quantiteLocale <= 0}
          onClick={() => ajusterDelta(-1)}
          className={`${boutonTaille} flex items-center justify-center rounded-lg bg-white dark:bg-white/10 text-brand-black dark:text-white hover:bg-brand-light-grey/60 dark:hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-white/10 transition-all active:scale-90 shadow-2xs cursor-pointer`}
          title="Diminuer le stock (-1)"
        >
          {enCours ? (
            <Loader2 className={`${iconeTaille} animate-spin text-brand-warm-grey dark:text-brand-warm-grey`} />
          ) : (
            <Minus className={iconeTaille} />
          )}
        </button>
      )}

      {/* Saisie Directe au Clavier Zéro-Friction */}
      <div className="flex items-center gap-0.5 px-1 rounded-lg bg-white/40 dark:bg-white/5">
        <Package className="w-3.5 h-3.5 text-brand-orange dark:text-brand-orange shrink-0" />
        <input
          type="number"
          min={0}
          max={1000}
          value={quantiteLocale}
          disabled={enCours || !peutModifier}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            setQuantiteLocale(isNaN(parsed) ? 0 : parsed);
          }}
          onBlur={() => {
            if (quantiteLocale !== quantiteActuelle) {
              void validerNouvelleQuantite(quantiteLocale);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="w-11 h-6 text-center font-mono font-black text-xs bg-transparent border-0 focus:ring-1 focus:ring-brand-orange text-brand-black dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
          title="Modifier directement la quantité (Entrée ou clic ailleurs pour valider)"
        />
        <span className="text-[10px] font-bold text-brand-warm-grey dark:text-brand-warm-grey uppercase">u.</span>
      </div>

      {/* Bouton Plus (+) */}
      {peutModifier && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => ajusterDelta(1)}
          className={`${boutonTaille} flex items-center justify-center rounded-lg bg-brand-orange text-white hover:bg-brand-orange/90 dark:hover:brightness-110 disabled:opacity-40 transition-all active:scale-90 shadow-2xs cursor-pointer`}
          title="Augmenter le stock (+1)"
        >
          {enCours ? (
            <Loader2 className={`${iconeTaille} animate-spin text-white`} />
          ) : (
            <Plus className={iconeTaille} />
          )}
        </button>
      )}
    </div>
  );
}
