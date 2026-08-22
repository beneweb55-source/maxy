import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";

/**
 * Hook global pour intercepter le bouton Retour physique sur Android (Capacitor).
 * Il doit être monté une seule fois, de préférence au niveau de l'AppShell.
 * 
 * S'il y a de l'historique disponible (modale ouverte via pushState, ou page précédente),
 * on invoque nativement le retour (qui fermera la modale ou remontera la navigation).
 * Sinon, on ferme proprement l'application.
 */
export function useCapacitorHardwareBack() {
  useEffect(() => {
    // Ne s'exécute que sur Capacitor (sur le web classique 'window.Capacitor' n'est pas défini)
    if (typeof window === "undefined" || !(window as any).Capacitor || !(window as any).Capacitor.isNativePlatform()) {
      return;
    }

    const listener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      // Sur Capacitor Android, si le WebView indique qu'il peut reculer, 
      // ou si Next.js a créé un historique de navigation :
      if (canGoBack || window.history.length > 2) {
        window.history.back();
      } else {
        // Aucune modale ouverte, et nous sommes à l'historique racine (ex: Dashboard)
        void CapacitorApp.exitApp();
      }
    });

    return () => {
      void listener.then((l) => l.remove());
    };
  }, []);
}
