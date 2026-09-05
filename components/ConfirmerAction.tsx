"use client";

import { useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";

/**
 * Composant de confirmation modal réutilisable remplaçant window.confirm.
 * Gère automatiquement Escape pour annuler, Enter pour confirmer.
 * Empêche la fermeture par le clic sur le fond.
 */
export default function ConfirmerAction({
  ouverte,
  onConfirmer,
  onAnnuler,
  titre = "Confirmer l'action",
  message,
  labelConfirmer = "Confirmer",
  labelAnnuler = "Annuler",
  variante = "danger", // "danger" | "warning" | "info"
  icone, // Optional custom icon element
}: {
  ouverte: boolean;
  onConfirmer: () => void | Promise<void>;
  onAnnuler: () => void;
  titre?: string;
  message: string;
  labelConfirmer?: string;
  labelAnnuler?: string;
  variante?: "danger" | "warning" | "info";
  icone?: React.ReactNode;
}) {
  const boutonRef = useRef<HTMLButtonElement>(null);

  // Focus automatique sur le bouton d'annulation à l'ouverture (sécurité : ne pas focus "confirmer")
  useEffect(() => {
    if (ouverte) {
      // Petit délai pour laisser le portail se monter
      const timer = setTimeout(() => boutonRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [ouverte]);

  // Gestion Escape / Enter
  useEffect(() => {
    if (!ouverte) return;
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onAnnuler();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirmer();
      }
    }
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouverte, onAnnuler, onConfirmer]);

  // Lock scroll
  useEffect(() => {
    if (!ouverte) return;
    const style = document.body.style;
    const original = style.overflow;
    style.overflow = "hidden";
    return () => { style.overflow = original; };
  }, [ouverte]);

  const couleurs = {
    danger: {
      fond: "bg-danger",
      fondHover: "hover:bg-danger/90",
      icone: "text-danger",
      fondIc: "bg-danger/10",
    },
    warning: {
      fond: "bg-amber-600",
      fondHover: "hover:bg-amber-700",
      icone: "text-amber-600",
      fondIc: "bg-amber-100",
    },
    info: {
      fond: "bg-brand-orange",
      fondHover: "hover:bg-brand-orange/90",
      icone: "text-brand-orange",
      fondIc: "bg-brand-orange/10",
    },
  };

  const c = couleurs[variante];

  const gererConfirmer = useCallback(async () => {
    await onConfirmer();
  }, [onConfirmer]);

  if (!ouverte) return null;

  const iconeParDefaut = variante === "danger" ? (
    <Trash2 className={`w-6 h-6 ${c.icone}`} />
  ) : (
    <AlertTriangle className={`w-6 h-6 ${c.icone}`} />
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={titre}
    >
      {/* Fond sombre */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onAnnuler} />

      {/* Boîte de dialogue */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-brand-paper rounded-2xl shadow-2xl border border-brand-light-grey/80 dark:border-white/10 overflow-hidden animate-entree">
        {/* En-tête */}
        <div className="flex items-center gap-3 p-5 pb-0">
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${c.fondIc}`}>
            {icone || iconeParDefaut}
          </div>
          <h3 className="flex-1 text-base font-bold text-brand-black dark:text-white font-outfit">
            {titre}
          </h3>
          <button
            type="button"
            onClick={onAnnuler}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-brand-warm-grey hover:bg-brand-light-grey/60 hover:text-brand-black transition-colors"
            aria-label="Annuler"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="px-5 pt-3 pb-5">
          <p className="text-sm text-brand-warm-grey dark:text-brand-grey leading-relaxed">
            {message}
          </p>
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-brand-light-grey/20 dark:bg-white/5 border-t border-brand-light-grey/40 dark:border-white/10">
          <button
            ref={boutonRef}
            type="button"
            onClick={onAnnuler}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-brand-warm-grey dark:text-brand-grey bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 hover:bg-brand-light-grey/60 dark:hover:bg-white/10 transition-colors min-h-[44px]"
          >
            {labelAnnuler}
          </button>
          <button
            type="button"
            onClick={gererConfirmer}
            className={`px-5 py-2.5 rounded-xl text-sm font-black text-white transition-colors min-h-[44px] ${c.fond} ${c.fondHover}`}
          >
            {labelConfirmer}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
