"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { closeTopLayer, hasOpenLayers } from "./useLayerStack";
import { naviguerRetourInterne } from "./useHistoriqueNavigation";

/**
 * Hook centralisé pour intercepter et orchestrer le geste / bouton Retour natif (Capacitor Android).
 *
 * Hiérarchie d'exécution :
 * 1. Couche UI ouverte (modale, visionneuse, menu latéral, scanner) ➔ fermer / protéger
 * 2. Historique interne Gestion-Maxy ➔ naviguer vers l'écran précédent réel
 * 3. Page racine ("/") ➔ sécurité anti-fermeture accidentelle (double retour pour quitter)
 */
export function useCapacitorHardwareBack(afficherToast?: (msg: string) => void) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const dernierAppuiRef = useRef<number>(0);
  const afficherToastRef = useRef(afficherToast);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    afficherToastRef.current = afficherToast;
  }, [afficherToast]);

  useEffect(() => {
    // Vérification Capacitor Native Platform
    if (typeof window === "undefined" || !Capacitor.isNativePlatform()) {
      return;
    }

    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      // 1. Couche UI ouverte ? (Modale, Visionneuse, BottomSheet, Menu latéral, Scanner)
      if (hasOpenLayers()) {
        const ferme = closeTopLayer();
        if (ferme) {
          return;
        }
      }

      // 2. Navigation dans l'historique interne Gestion-Maxy
      const navigue = naviguerRetourInterne(router, pathnameRef.current || "/");
      if (navigue) {
        return;
      }

      // 3. Sur l'écran racine ("/") sans historique : gestion de la sortie sécurisée
      const maintenant = Date.now();
      if (maintenant - dernierAppuiRef.current < 2000) {
        // Second appui dans les 2 secondes ➔ Quitter l'application
        void CapacitorApp.exitApp();
      } else {
        // Premier appui ➔ Avertissement informatif
        dernierAppuiRef.current = maintenant;
        if (afficherToastRef.current) {
          afficherToastRef.current("Appuyez à nouveau pour quitter l'application");
        }
      }
    });

    return () => {
      void listenerPromise.then((handle) => handle.remove());
    };
  }, [router]);
}
