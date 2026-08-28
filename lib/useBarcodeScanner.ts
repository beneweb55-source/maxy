"use client";

import { useEffect, useRef } from "react";

export function useBarcodeScanner(onScan: (code: string) => void) {
  const buffer = useRef("");
  const lastTime = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignorer si on est dans un champ texte long, mais pas dans l'input scanner par defaut
      if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;
      
      const now = Date.now();
      // Tolérance augmentée à 500ms pour gérer la latence Bluetooth et le réveil de la douchette
      if (now - lastTime.current > 500) {
        buffer.current = ""; // Réinitialiser si on tape trop lentement (frappe humaine)
      }
      
      if (e.key === "Enter") {
        if (buffer.current.length > 2) {
          onScan(buffer.current.trim());
          buffer.current = "";
          
          // Si le focus était sur un input, on empêche la soumission du formulaire
          if (e.target && (e.target as HTMLElement).tagName === "INPUT") {
            const input = e.target as HTMLInputElement;
            // On peut optionnellement vider l'input si le code barre y a été écrit
            input.value = "";
          }
          e.preventDefault();
        }
        return;
      }
      
      // Stocker les caractères standards (lettres et chiffres)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer.current += e.key;
      }
      lastTime.current = now;
    }

    // Capture (true) permet d'intercepter l'événement avant qu'il n'atteigne les inputs
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onScan]);
}
