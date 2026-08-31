"use client";

import React from "react";
import ModaleVente, { ArticleAVendre } from "@/components/ventes/ModaleVente";
import type { LigneProduit } from "./CarteProduit";

interface ModaleVenteInventaireProps {
  ouverte: boolean;
  unites: LigneProduit[];
  onFermer: () => void;
  onSucces: () => void;
}

export default function ModaleVenteInventaire({
  ouverte,
  unites,
  onFermer,
  onSucces,
}: ModaleVenteInventaireProps) {
  const articles: ArticleAVendre[] = unites.map((u) => ({
    id: u.id,
    code_interne: u.code_interne,
    reference: u.reference,
    prix_achat: u.prix_achat,
    prix_vente_fixe: u.prix_vente_fixe,
    prix_vente_reel: u.prix_vente_reel,
    etiquette_imprimee: u.etiquette_imprimee,
  }));

  return (
    <ModaleVente
      ouverte={ouverte}
      unites={articles}
      onFermer={onFermer}
      onSucces={onSucces}
    />
  );
}
