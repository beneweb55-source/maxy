"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { IconeAlerte, IconeCocheCercle } from "./icons";

type TypeToast = "succes" | "erreur";

interface Toast {
  id: number;
  message: string;
  type: TypeToast;
}

const ContexteToast = createContext<{
  afficher: (message: string, type?: TypeToast) => void;
} | null>(null);

export function useToast() {
  const contexte = useContext(ContexteToast);
  if (!contexte) throw new Error("useToast doit être utilisé sous <FournisseurToasts>.");
  return contexte;
}

export function FournisseurToasts({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const compteur = useRef(0);

  const afficher = useCallback((message: string, type: TypeToast = "succes") => {
    const id = ++compteur.current;
    setToasts((liste) => [...liste, { id, message, type }]);
    setTimeout(() => {
      setToasts((liste) => liste.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ContexteToast.Provider value={{ afficher }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2 print:hidden">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              t.type === "succes" ? "bg-succes" : "bg-danger"
            }`}
          >
            <span className="mt-0.5 shrink-0" aria-hidden>
              {t.type === "succes" ? <IconeCocheCercle taille={16} /> : <IconeAlerte taille={16} />}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ContexteToast.Provider>
  );
}
