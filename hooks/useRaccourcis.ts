import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { closeTopLayer } from "./useLayerStack";

interface RaccourcisProps {
  role: string;
  onOuvrirRecherche: () => void;
  onOuvrirGuide: () => void;
}

export function useRaccourcis({ role, onOuvrirRecherche, onOuvrirGuide }: RaccourcisProps) {
  const router = useRouter();

  useEffect(() => {
    const gererRaccourcis = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const activeElement = document.activeElement;
        const wasFocused = activeElement && activeElement !== document.body;
        
        if (wasFocused) {
          (activeElement as HTMLElement).blur();
        }

        const layerClosed = closeTopLayer();

        if (!layerClosed && !wasFocused) {
          router.back();
        }
        return;
      }
      
      // Ctrl+K ou Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOuvrirRecherche();
        return;
      }

      // Ctrl+N ou Cmd+N (Nouveau lot - gérant uniquement)
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && role === "gerant") {
        e.preventDefault();
        router.push("/arrivages/nouveau");
        return;
      }

      // Ctrl+I ou Cmd+I (Inventaire)
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        router.push("/inventaire");
        return;
      }

      // Ctrl+O ou Cmd+O (Commandes)
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        router.push("/commandes");
        return;
      }

      // Ctrl+Shift+F → Nouvelle facture (Ctrl+F reste le browser)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "F") {
        e.preventDefault();
        router.push("/factures");
        return;
      }

      // Ctrl+H ou Cmd+H (Guide des raccourcis)
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        onOuvrirGuide();
        return;
      }

      // Ignore si le focus est dans un input (pour les autres raccourcis éventuels)
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
    };

    window.addEventListener("keydown", gererRaccourcis);
    return () => window.removeEventListener("keydown", gererRaccourcis);
  }, [role, router, onOuvrirRecherche, onOuvrirGuide]);
}
