"use client";

import React from "react";
import UniversalStockManager from "@/components/produits/UniversalStockManager";

interface ModaleArrivageRapideProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces: () => void;
  modeleId?: number | null;
  modeleNom: string;
  categorieId?: number | null;
  prixAchatDefaut?: number;
  prixVenteDefaut?: number | null;
  lots?: { id: number; fournisseur: string; date_entree: string }[];
}

/**
 * @deprecated Remplacé par UniversalStockManager (DRY).
 * Conserve la rétro-compatibilité avec les anciens points d'appel.
 */
export default function ModaleArrivageRapide({
  ouvert,
  onFermer,
  onSucces,
  modeleId,
  modeleNom,
  categorieId,
  prixAchatDefaut,
  prixVenteDefaut,
  lots,
}: ModaleArrivageRapideProps) {
  return (
    <UniversalStockManager
      ouvert={ouvert}
      onFermer={onFermer}
      onSucces={onSucces}
      cible={{
        modeleId,
        reference: modeleNom,
        categorie_id: categorieId,
        prix_achat: prixAchatDefaut,
        prix_vente_fixe: prixVenteDefaut,
        lot_id: lots && lots.length > 0 ? lots[0]?.id : undefined,
      }}
    />
  );
}
