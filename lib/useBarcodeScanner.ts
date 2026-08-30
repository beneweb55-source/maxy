"use client";

import { useEffect, useRef } from "react";

export interface BarcodeScannerOptions {
  maxIntervalMs?: number;
  minLength?: number;
  preventInTextarea?: boolean;
}

export function useBarcodeScanner(
  onScan: (code: string) => void,
  options: BarcodeScannerOptions = {}
) {
  const {
    maxIntervalMs = 60,
    minLength = 3,
    preventInTextarea = true,
  } = options;

  const buffer = useRef<string>("");
  const lastTime = useRef<number>(0);
  const timestamps = useRef<number[]>([]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;

      // Ignorer si l'utilisateur est dans un textarea
      if (preventInTextarea && target && target.tagName === "TEXTAREA") {
        return;
      }

      const now = Date.now();
      const interval = now - lastTime.current;

      // Si le temps entre 2 touches dépasse le seuil max, on réinitialise le buffer
      if (interval > maxIntervalMs && buffer.current.length > 0) {
        buffer.current = "";
        timestamps.current = [];
      }

      if (e.key === "Enter") {
        if (buffer.current.length >= minLength) {
          // Vérification de la vitesse moyenne de frappe (< 50ms = douchette matérielle)
          const totalDuration = now - (timestamps.current[0] || now);
          const avgInterval = timestamps.current.length > 1 ? totalDuration / timestamps.current.length : interval;

          if (avgInterval <= maxIntervalMs || timestamps.current.length >= 4) {
            const scannedCode = buffer.current.trim();
            onScan(scannedCode);
            buffer.current = "";
            timestamps.current = [];

            // Si le focus était dans un champ texte, empêcher l'envoi de formulaire ou le saut de ligne
            if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) {
              e.preventDefault();
              e.stopPropagation();
            }
            return;
          }
        }
        buffer.current = "";
        timestamps.current = [];
        return;
      }

      // Stocker les caractères imprimables
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer.current += e.key;
        timestamps.current.push(now);
      }
      lastTime.current = now;
    }

    // Capture = true pour intercepter avant les handlers locaux
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onScan, maxIntervalMs, minLength, preventInTextarea]);
}

