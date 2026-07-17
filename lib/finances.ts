export function margeVente(
  prixVenteReel: number,
  prixAchat: number,
  coutReparations: number
): number {
  return prixVenteReel - prixAchat - coutReparations;
}

export function seuilMargeMinimum(
  prixAchat: number,
  coutReparations: number,
  margeMinimumPct: number
): number {
  return Math.round((prixAchat + coutReparations) * (1 + margeMinimumPct / 100));
}
