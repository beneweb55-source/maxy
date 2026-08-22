import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App as CapacitorApp } from "@capacitor/app";
import { closeTopLayer, hasOpenLayers } from "./useLayerStack";

/**
 * Hook global pour intercepter le bouton Retour physique sur Android (Capacitor).
 * Il doit être monté une seule fois, de préférence au niveau de l'AppShell.
 *
 * Logique :
 * 1. S'il y a une couche UI ouverte (modale, menu, visionneuse), on la ferme.
 * 2. Sinon, on utilise router.back() de Next.js pour une navigation propre.
 * 3. Si on est sur la page racine (pas d'historique), on ferme l'application.
 *
 * On ne touche JAMAIS directement à window.history.back() pour éviter les
 * conflits avec le patch pushState/replaceState de Next.js 15 App Router.
 */
export function useCapacitorHardwareBack() {
  const router = useRouter();

  useEffect(() => {
    // Ne s'exécute que sur Capacitor (sur le web classique 'window.Capacitor' n'est pas défini)
    if (typeof window === "undefined" || !(window as any).Capacitor || !(window as any).Capacitor.isNativePlatform()) {
      return;
    }

    const listener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      // 1. Si une couche UI est ouverte (modale, menu, visionneuse), on la ferme.
      if (hasOpenLayers()) {
        closeTopLayer();
        return;
      }

      // 2. S'il y a de l'historique de navigation, on revient en arrière via Next.js.
      if (canGoBack) {
        router.back();
        return;
      }

      // 3. Aucune couche ouverte et pas d'historique → fermer l'app.
      void CapacitorApp.exitApp();
    });

    return () => {
      void listener.then((l) => l.remove());
    };
  }, [router]);
}
