/**
 * Pile globale de couches UI (modales, menus, visionneuses, scanners).
 *
 * Chaque composant UI qui s'ouvre en tant que couche s'enregistre ici avec
 * une priorité et une fonction de fermeture. Le gestionnaire central de Retour Android
 * (Capacitor) interroge cette pile pour fermer la couche active la plus prioritaire
 * sans collision ni régression.
 */

import { useEffect, useRef } from "react";

export type LayerCloseResult = boolean | void;

export interface LayerEntry {
  id: string;
  close: () => LayerCloseResult;
  priority: number;
  timestamp: number;
}

// Constantes de priorité
export const LAYER_PRIORITY = {
  SCANNER: 50,
  VISIONNEUSE: 40,
  MODALE: 30,
  BOTTOM_SHEET: 20,
  MENU: 10,
  DEFAUT: 20,
} as const;

// Pile singleton partagée
const stack: LayerEntry[] = [];

/**
 * Empile ou met à jour une couche UI.
 */
export function pushLayer(
  id: string,
  close: () => LayerCloseResult,
  priority: number = LAYER_PRIORITY.DEFAUT
) {
  const index = stack.findIndex((entry) => entry.id === id);
  if (index !== -1 && stack[index]) {
    stack[index]!.close = close;
    stack[index]!.priority = priority;
    return;
  }
  stack.push({
    id,
    close,
    priority,
    timestamp: Date.now(),
  });
  // Trier : plus haute priorité d'abord, puis timestamp décroissant (le plus récent d'abord)
  stack.sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp);
}

/**
 * Dépile une couche spécifique.
 */
export function popLayer(id: string) {
  const index = stack.findIndex((entry) => entry.id === id);
  if (index !== -1) {
    stack.splice(index, 1);
  }
}

/**
 * Tente de fermer la couche la plus haute de la pile.
 * Retourne `true` si une couche a intercepté et traité le retour,
 * `false` si aucune couche n'était active.
 */
export function closeTopLayer(): boolean {
  if (stack.length === 0) return false;

  // L'élément le plus prioritaire et le plus récent est en tête (index 0)
  const top = stack[0];
  if (!top) return false;

  // Exécuter le handler de fermeture
  const result = top.close();

  // Si le callback renvoie explicitement false (ex: utilisateur annule la sortie d'un formulaire modifié),
  // on ne dépile pas la couche, mais on a bien consommé l'événement Retour.
  if (result === false) {
    return true;
  }

  // Si fermeture acceptée, retirer de la pile
  popLayer(top.id);
  return true;
}

/**
 * Indique si au moins une couche UI est actuellement ouverte.
 */
export function hasOpenLayers(): boolean {
  return stack.length > 0;
}

/**
 * Hook React pour enregistrer/désenregistrer automatiquement une couche UI.
 */
export function useLayer(
  id: string,
  active: boolean,
  closeCallback: () => LayerCloseResult,
  priority: number = LAYER_PRIORITY.DEFAUT
) {
  const closeRef = useRef(closeCallback);
  useEffect(() => {
    closeRef.current = closeCallback;
  }, [closeCallback]);

  useEffect(() => {
    if (active) {
      pushLayer(id, () => closeRef.current(), priority);
      return () => {
        popLayer(id);
      };
    }
  }, [id, active, priority]);
}
