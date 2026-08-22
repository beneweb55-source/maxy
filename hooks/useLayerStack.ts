/**
 * Pile globale de couches UI (modales, menus, visionneuses).
 *
 * Chaque composant qui s'ouvre en tant que "couche" (modale, menu latéral,
 * visionneuse plein écran) s'enregistre ici à l'ouverture et se désenregistre
 * à la fermeture. Le bouton Retour Android (Capacitor) interroge cette pile
 * pour fermer la couche la plus haute sans toucher à window.history.
 *
 * Cela évite tout conflit avec le patch automatique de pushState/replaceState
 * par Next.js 15 App Router.
 */

import { useEffect, useRef } from "react";

interface LayerEntry {
  id: string;
  close: () => void;
}

// Pile singleton — partagée entre tous les composants.
const stack: LayerEntry[] = [];

/** Empile une nouvelle couche. */
export function pushLayer(id: string, close: () => void) {
  // Évite les doublons (re-render React).
  if (stack.some((entry) => entry.id === id)) return;
  stack.push({ id, close });
}

/** Dépile une couche spécifique (par son id). */
export function popLayer(id: string) {
  const index = stack.findIndex((entry) => entry.id === id);
  if (index !== -1) stack.splice(index, 1);
}

/**
 * Ferme la couche la plus haute de la pile.
 * Retourne `true` si une couche a été fermée, `false` si la pile était vide.
 */
export function closeTopLayer(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  // On retire d'abord de la pile pour éviter que le callback de fermeture
  // ne tente de pop à nouveau.
  stack.pop();
  top.close();
  return true;
}

/** Retourne `true` si au moins une couche est ouverte. */
export function hasOpenLayers(): boolean {
  return stack.length > 0;
}

/**
 * Hook React pour enregistrer/désenregistrer automatiquement une couche.
 * Le `closeCallback` est stocké dans une ref pour éviter les problèmes
 * de fermeture stale.
 */
export function useLayer(id: string, active: boolean, closeCallback: () => void) {
  const closeRef = useRef(closeCallback);
  useEffect(() => {
    closeRef.current = closeCallback;
  }, [closeCallback]);

  useEffect(() => {
    if (active) {
      pushLayer(id, () => closeRef.current());
      return () => {
        popLayer(id);
      };
    }
  }, [id, active]);
}
