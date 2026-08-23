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
      
      // Ignore si le focus est dans un input (pour les autres raccourcis)
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Ctrl+K ou Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOuvrirRecherche();
      }

      // Ctrl+N ou Cmd+N (Nouveau lot - gérant uniquement)
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && role === "gerant") {
        e.preventDefault();
        router.push("/arrivages/nouveau");
      }

      // Ctrl+I ou Cmd+I (Inventaire)
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        router.push("/inventaire");
      }

      // Ctrl+H ou Cmd+H (Guide des raccourcis)
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        onOuvrirGuide();
      }
    };

    window.addEventListener("keydown", gererRaccourcis);
    return () => window.removeEventListener("keydown", gererRaccourcis);
  }, [role, router, onOuvrirRecherche, onOuvrirGuide]);
}
