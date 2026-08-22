"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface EntreeHistorique {
  pathname: string;
  search: string;
  url: string;
}

// Stack en mémoire pour la session active
const stackHistorique: EntreeHistorique[] = [];
const CLE_STORAGE = "gestion_maxy_nav_stack";

// Charger l'historique depuis sessionStorage au premier chargement côté client
function chargerPile(): EntreeHistorique[] {
  if (typeof window === "undefined") return [];
  try {
    const brut = sessionStorage.getItem(CLE_STORAGE);
    if (brut) {
      const parsed = JSON.parse(brut);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignorer si stockage inaccessible
  }
  return [];
}

function sauvegarderPile(pile: EntreeHistorique[]) {
  if (typeof window === "undefined") return;
  try {
    // Garder au maximum 50 entrées récentes
    const troncature = pile.slice(-50);
    sessionStorage.setItem(CLE_STORAGE, JSON.stringify(troncature));
  } catch {
    // Ignorer
  }
}

// Initialisation synchrone
if (typeof window !== "undefined" && stackHistorique.length === 0) {
  const charge = chargerPile();
  if (charge.length > 0) {
    stackHistorique.push(...charge);
  }
}

/**
 * Détermine la route parente logique en cas de lien direct ou historique tronqué.
 */
export function getParentFallback(pathname: string): string {
  if (pathname.startsWith("/produits/")) {
    return "/inventaire";
  }
  if (pathname.startsWith("/lots/")) {
    return "/arrivages";
  }
  if (pathname.startsWith("/factures/")) {
    return "/factures";
  }
  if (pathname.startsWith("/rapports/")) {
    return "/rapports";
  }
  if (pathname === "/imprimer-etiquettes") {
    return "/inventaire";
  }
  if (pathname === "/connexion") {
    return "/";
  }
  if (pathname !== "/") {
    return "/";
  }
  return "/";
}

/**
 * Enregistre une navigation dans l'historique interne.
 */
export function enregistrerRoute(pathname: string, searchParamsString: string) {
  const search = searchParamsString ? `?${searchParamsString}` : "";
  const url = `${pathname}${search}`;

  if (stackHistorique.length === 0) {
    stackHistorique.push({ pathname, search, url });
    sauvegarderPile(stackHistorique);
    return;
  }

  const dernier = stackHistorique[stackHistorique.length - 1];

  // Si on est sur le même pathname avec des searchParams différents (ex: filtres inventaire),
  // on remplace la dernière entrée pour ne pas créer un historique artificiel géant
  if (dernier && dernier.pathname === pathname) {
    dernier.search = search;
    dernier.url = url;
    sauvegarderPile(stackHistorique);
    return;
  }

  // Éviter d'ajouter l'avant-dernière entrée si l'utilisateur est déjà revenu en arrière
  if (
    stackHistorique.length >= 2 &&
    stackHistorique[stackHistorique.length - 2]?.url === url
  ) {
    stackHistorique.pop();
    sauvegarderPile(stackHistorique);
    return;
  }

  stackHistorique.push({ pathname, search, url });
  sauvegarderPile(stackHistorique);
}

/**
 * Tente d'exécuter un retour arrière dans l'historique interne Gestion-Maxy.
 * Retourne `true` si une navigation arrière a été effectuée,
 * `false` si l'utilisateur est déjà à la racine sans destination précédente.
 */
export function naviguerRetourInterne(
  router: AppRouterInstance,
  currentPathname: string
): boolean {
  // Retirer l'écran actuel de la pile s'il est au sommet
  if (stackHistorique.length > 0) {
    const top = stackHistorique[stackHistorique.length - 1];
    if (top && (top.pathname === currentPathname || top.url.startsWith(currentPathname))) {
      stackHistorique.pop();
    }
  }

  // 1. S'il existe une entrée précédente dans notre pile
  if (stackHistorique.length > 0) {
    const destination = stackHistorique.pop();
    sauvegarderPile(stackHistorique);
    if (destination && destination.url !== currentPathname) {
      router.push(destination.url);
      return true;
    }
  }

  // 2. Si la pile est vide mais qu'on est sur une sous-page (ex: /produits/12, /lots/3, /inventaire)
  if (currentPathname !== "/") {
    const fallback = getParentFallback(currentPathname);
    if (fallback !== currentPathname) {
      router.push(fallback);
      return true;
    }
  }

  // 3. On est sur la page racine ("/") et aucun historique interne
  return false;
}

/**
 * Hook à brancher dans le layout ou AppShell pour tracer la navigation.
 */
export function useSuiviNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchStr = searchParams?.toString() ?? "";

  useEffect(() => {
    if (pathname) {
      enregistrerRoute(pathname, searchStr);
    }
  }, [pathname, searchStr]);
}
