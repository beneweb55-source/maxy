"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Langue } from "./types";
import { fr } from "./fr";
import { en } from "./en";
import { interpoler, resoudre } from "./traduire";

const DICTIONNAIRES = { fr, en } as const;

const UN_AN_S = 60 * 60 * 24 * 365;

export type FonctionT = (
  cle: string,
  params?: Record<string, string | number>
) => string;

interface ValeurContexteLangue {
  langue: Langue;
  definirLangue: (langue: Langue) => void;
  t: FonctionT;
}

const ContexteLangue = createContext<ValeurContexteLangue | null>(null);

export function LangueProvider({
  langueInitiale,
  children,
}: {
  langueInitiale: Langue;
  children: ReactNode;
}) {
  const [langue, setLangue] = useState<Langue>(langueInitiale);

  const definirLangue = useCallback((prochaine: Langue) => {
    setLangue(prochaine);
    if (typeof document !== "undefined") {
      document.documentElement.lang = prochaine;
      // Cache lisible côté serveur (SSR sans clignotement) synchronisé avec la DB.
      document.cookie = `langue=${prochaine}; path=/; max-age=${UN_AN_S}; samesite=lax`;
    }
    // Persistance sur le compte (best effort : la bascule reste effective même
    // si la base est indisponible).
    void fetch("/api/parametres/langue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ langue: prochaine }),
    }).catch(() => {});
  }, []);

  const t = useCallback<FonctionT>(
    (cle, params) => {
      const valeur = resoudre(DICTIONNAIRES[langue], cle) ?? resoudre(fr, cle) ?? cle;
      return interpoler(valeur, params);
    },
    [langue]
  );

  const valeur = useMemo(
    () => ({ langue, definirLangue, t }),
    [langue, definirLangue, t]
  );

  return <ContexteLangue.Provider value={valeur}>{children}</ContexteLangue.Provider>;
}

export function useLangue(): ValeurContexteLangue {
  const contexte = useContext(ContexteLangue);
  if (!contexte) {
    throw new Error("useLangue doit être utilisé à l'intérieur d'un LangueProvider.");
  }
  return contexte;
}

/** Raccourci : renvoie uniquement la fonction de traduction `t`. */
export function useT(): FonctionT {
  return useLangue().t;
}
