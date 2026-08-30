import { useState, useEffect, useRef, useCallback } from "react";

interface BrouillonData<T> {
  data: T;
  timestamp: number;
}

/**
 * Hook pour gérer la sauvegarde automatique (brouillon) d'un formulaire.
 * Protège contre la perte de données et empêche les données serveur d'écraser
 * la saisie locale en cours de frappe.
 */
export function useBrouillon<T>(
  cle: string,
  valeurInitiale: T,
  actif: boolean = true
) {
  const [valeur, setValeur] = useState<T>(valeurInitiale);
  const [brouillonDisponible, setBrouillonDisponible] = useState<BrouillonData<T> | null>(null);
  
  const isDirty = useRef(false);
  const cleRef = useRef(cle);

  // Initialisation et changement de contexte (changement de clé)
  useEffect(() => {
    if (!actif || !cle) return;
    
    if (cle !== cleRef.current) {
      // Le contexte a changé (ex: on modifie un autre produit), on force la réinitialisation
      setValeur(valeurInitiale);
      cleRef.current = cle;
      isDirty.current = false;
      setBrouillonDisponible(null);
    }

    try {
      const saved = localStorage.getItem(cle);
      if (saved) {
        const parsed = JSON.parse(saved) as BrouillonData<T>;
        
        // On ne propose le brouillon que s'il est différent de la valeur initiale
        // (pour éviter de proposer de restaurer un brouillon identique à la DB)
        if (JSON.stringify(parsed.data) !== JSON.stringify(valeurInitiale)) {
          setBrouillonDisponible(parsed);
        } else {
          // S'il est identique, on peut le nettoyer
          localStorage.removeItem(cle);
        }
      }
    } catch (e) {
      console.error("Erreur lecture brouillon", e);
    }
  }, [cle, actif, valeurInitiale]);

  // Sauvegarde automatique avec debounce
  useEffect(() => {
    if (!actif || !cle) return;
    
    const currentJson = JSON.stringify(valeur);
    const initialJson = JSON.stringify(valeurInitiale);
    
    if (currentJson === initialJson) {
      isDirty.current = false;
      return;
    }
    
    isDirty.current = true;
    
    const timeoutId = setTimeout(() => {
      const dataToSave: BrouillonData<T> = {
        data: valeur,
        timestamp: Date.now(),
      };
      localStorage.setItem(cle, JSON.stringify(dataToSave));
    }, 600); // 600ms debounce

    return () => clearTimeout(timeoutId);
  }, [valeur, cle, actif, valeurInitiale]);

  const restaurerBrouillon = useCallback(() => {
    if (brouillonDisponible) {
      setValeur(brouillonDisponible.data);
      setBrouillonDisponible(null);
      isDirty.current = true;
    }
  }, [brouillonDisponible]);

  const supprimerBrouillon = useCallback(() => {
    if (cle) {
      localStorage.removeItem(cle);
    }
    setBrouillonDisponible(null);
    // On ne remet pas isDirty à false ici car l'utilisateur est peut-être
    // encore en train de modifier le formulaire, on supprime juste le vieux brouillon.
  }, [cle]);
  
  // À appeler quand le formulaire est soumis avec succès
  const validerEtVider = useCallback(() => {
     if (cle) localStorage.removeItem(cle);
     isDirty.current = false;
  }, [cle]);

  // Forcer la valeur depuis l'extérieur (ex: réinitialisation explicite)
  const setValeurForcee = useCallback((nouvelleValeur: T) => {
    setValeur(nouvelleValeur);
  }, []);

  const estModifie = JSON.stringify(valeur) !== JSON.stringify(valeurInitiale);

  return {
    valeur,
    setValeur,
    setValeurForcee,
    isDirty: estModifie,
    brouillonDisponible,
    restaurerBrouillon,
    supprimerBrouillon,
    validerEtVider
  };
}
