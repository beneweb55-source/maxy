"use client";

import { useState, useCallback, useRef } from "react";

interface ConfirmationConfig {
  titre?: string;
  message: string;
  labelConfirmer?: string;
  labelAnnuler?: string;
  variante?: "danger" | "warning" | "info";
  icone?: React.ReactNode;
}

interface ConfirmationState extends ConfirmationConfig {
  ouverte: boolean;
  resolvePromise: ((value: boolean) => void) | null;
}

/**
 * Hook pour remplacer window.confirm().
 *
 * Utilisation :
 * ```tsx
 * const { confirmer, propsModal } = useConfirmation();
 *
 * const supprimer = async () => {
 *   const ok = await confirmer({
 *     message: "Supprimer cet élément ?",
 *     variante: "danger",
 *   });
 *   if (!ok) return;
 *   // ... effectuer la suppression
 * };
 *
 * return (
 *   <>
 *     <ConfirmerAction {...propsModal} />
 *     <button onClick={supprimer}>Supprimer</button>
 *   </>
 * );
 * ```
 */
export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    ouverte: false,
    resolvePromise: null,
    message: "",
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirmer = useCallback((config: ConfirmationConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        ...config,
        ouverte: true,
        resolvePromise: resolve,
      });
    });
  }, []);

  const gererConfirmer = useCallback(async () => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState((prev) => ({ ...prev, ouverte: false, resolvePromise: null }));
  }, []);

  const gererAnnuler = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState((prev) => ({ ...prev, ouverte: false, resolvePromise: null }));
  }, []);

  return {
    /** Demande une confirmation à l'utilisateur. Retourne `true` si confirmé, `false` sinon. */
    confirmer,
    /** Props à passer au composant <ConfirmerAction {...propsModal} /> */
    propsModal: {
      ouverte: state.ouverte,
      onConfirmer: gererConfirmer,
      onAnnuler: gererAnnuler,
      titre: state.titre,
      message: state.message,
      labelConfirmer: state.labelConfirmer,
      labelAnnuler: state.labelAnnuler,
      variante: state.variante,
      icone: state.icone,
    },
  };
}
