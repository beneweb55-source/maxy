"use client";

import React from "react";

/**
 * Composants Skeleton réutilisables pour les états de chargement.
 * Tous utilisent une animation pulse subtile avec les couleurs de marque.
 *
 * Usage :
 * ```tsx
 * import { SkeletonTable, SkeletonCard, SkeletonText } from "@/components/Skeleton";
 *
 * if (chargement) return <SkeletonTable lignes={5} />;
 * ```
 */

/** Bloc rectangulaire animé de base */
export function SkeletonBlock({
  className = "",
  largeur,
  hauteur,
}: {
  className?: string;
  largeur?: string;
  hauteur?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-brand-light-grey/50 dark:bg-white/10 ${className}`}
      style={{ width: largeur, height: hauteur }}
    />
  );
}

/** Ligne de texte animée */
export function SkeletonText({
  lignes = 1,
  className = "",
}: {
  lignes?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lignes }).map((_, i) => (
        <SkeletonBlock
          key={i}
          hauteur="14px"
          largeur={i === lignes - 1 ? "60%" : "100%"}
          className="rounded-md"
        />
      ))}
    </div>
  );
}

/** Carte de stats / KPI animée */
export function SkeletonKPI({ nombre = 4 }: { nombre?: number }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${nombre} gap-3 sm:gap-4`}>
      {Array.from({ length: nombre }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper animate-pulse"
        >
          <SkeletonBlock hauteur="12px" largeur="60%" className="mb-2 rounded" />
          <SkeletonBlock hauteur="28px" largeur="40%" className="rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Carte produit animée */
export function SkeletonCarteProduit({ nombre = 8 }: { nombre?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: nombre }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl border border-brand-light-grey/60 dark:border-white/10 bg-white dark:bg-brand-paper animate-pulse"
        >
          <div className="flex items-center gap-3 mb-3">
            <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock hauteur="14px" largeur="70%" className="rounded" />
              <SkeletonBlock hauteur="10px" largeur="40%" className="rounded" />
            </div>
          </div>
          <SkeletonText lignes={2} className="mb-3" />
          <div className="flex gap-2">
            <SkeletonBlock hauteur="32px" largeur="50%" className="rounded-lg" />
            <SkeletonBlock hauteur="32px" largeur="30%" className="rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Ligne de tableau animée */
export function SkeletonLigneTableau({ colonnes = 5 }: { colonnes?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colonnes }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonBlock
            hauteur="14px"
            largeur={i === 0 ? "30px" : `${50 + Math.random() * 30}%`}
            className="rounded"
          />
        </td>
      ))}
    </tr>
  );
}

/** Tableau complet animé */
export function SkeletonTable({
  lignes = 5,
  colonnes = 5,
}: {
  lignes?: number;
  colonnes?: number;
}) {
  return (
    <div className="bg-white dark:bg-brand-paper rounded-2xl border border-brand-light-grey/60 dark:border-white/10 overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="px-4 py-3 border-b border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/20 dark:bg-white/5">
          <div className="flex gap-6">
            {Array.from({ length: colonnes }).map((_, i) => (
              <SkeletonBlock
                key={i}
                hauteur="10px"
                largeur={i === 0 ? "30px" : `${60 + Math.random() * 40}px`}
                className="rounded"
              />
            ))}
          </div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-brand-light-grey/30 dark:divide-white/5">
          {Array.from({ length: lignes }).map((_, rowIdx) => (
            <div key={rowIdx} className="px-4 py-3 flex gap-6 items-center">
              {Array.from({ length: colonnes }).map((_, colIdx) => (
                <SkeletonBlock
                  key={colIdx}
                  hauteur="14px"
                  largeur={colIdx === 0 ? "30px" : `${40 + Math.random() * 60}%`}
                  className="rounded"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Sidebar / Navigation animée */
export function SkeletonNavigation() {
  return (
    <div className="space-y-1 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
          <SkeletonBlock className="w-5 h-5 rounded" />
          <SkeletonBlock
            hauteur="14px"
            largeur={`${50 + Math.random() * 30}%`}
            className="rounded"
          />
        </div>
      ))}
    </div>
  );
}

/** Page complète animée (header + KPI + tableau) */
export function SkeletonPage({
  titre = true,
  kpis = 4,
  tableauLignes = 5,
  tableauColonnes = 5,
}: {
  titre?: boolean;
  kpis?: number;
  tableauLignes?: number;
  tableauColonnes?: number;
}) {
  return (
    <div className="space-y-6 animate-entree">
      {titre && (
        <div className="space-y-2">
          <SkeletonBlock hauteur="12px" largeur="120px" className="rounded" />
          <SkeletonBlock hauteur="28px" largeur="300px" className="rounded-lg" />
          <SkeletonBlock hauteur="12px" largeur="200px" className="rounded" />
        </div>
      )}
      <SkeletonKPI nombre={kpis} />
      <SkeletonTable lignes={tableauLignes} colonnes={tableauColonnes} />
    </div>
  );
}
