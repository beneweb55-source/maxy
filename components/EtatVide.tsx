"use client";

import React from "react";
import { Package, Plus, Search, FolderOpen } from "lucide-react";

/**
 * Composant d'état vide professionnel.
 * Affiché quand une liste/tableau est vide.
 */
export default function EtatVide({
  icone,
  titre,
  description,
  actionLabel,
  onAction,
  variante = "defaut",
}: {
  icone?: React.ReactNode;
  titre: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variante?: "defaut" | "recherche" | "creation";
}) {
  const iconesDefaut = {
    defaut: <Package className="w-12 h-12 text-brand-warm-grey/50" />,
    recherche: <Search className="w-12 h-12 text-brand-warm-grey/50" />,
    creation: <FolderOpen className="w-12 h-12 text-brand-warm-grey/50" />,
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-4 p-4 rounded-2xl bg-brand-light-grey/30 dark:bg-white/5">
        {icone || iconesDefaut[variante]}
      </div>
      <h3 className="text-base font-bold text-brand-black dark:text-white mb-1 font-outfit">
        {titre}
      </h3>
      {description && (
        <p className="text-sm text-brand-warm-grey dark:text-brand-grey max-w-sm mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn btn-primaire text-xs py-2.5 px-5 rounded-xl font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
