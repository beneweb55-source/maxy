export const TYPES_MOUVEMENT = [
  "achat_lot",
  "vente",
  "annulation_vente",
  "apport_associe",
  "achat_piece",
  "frais",
  "retrait_parts",
  "transfert_reserve",
  "reinvest",
  "sortie",
] as const;

export type TypeMouvementCaisse = (typeof TYPES_MOUVEMENT)[number];

export type SensMouvement = "entree" | "sortie" | "neutre";

const SENS_PAR_TYPE: Record<TypeMouvementCaisse, SensMouvement> = {
  achat_lot: "sortie",
  vente: "entree",
  annulation_vente: "sortie",
  apport_associe: "entree",
  achat_piece: "sortie",
  frais: "sortie",
  retrait_parts: "sortie",
  transfert_reserve: "neutre",
  reinvest: "neutre",
  sortie: "sortie",
};

export const TYPES_SYSTEME: readonly TypeMouvementCaisse[] = [
  "achat_lot",
  "vente",
  "annulation_vente",
];

export const TYPES_MANUELS: readonly TypeMouvementCaisse[] = [
  "apport_associe",
  "achat_piece",
  "frais",
  "retrait_parts",
  "transfert_reserve",
];

export function sensMouvement(type: TypeMouvementCaisse): SensMouvement {
  return SENS_PAR_TYPE[type];
}

export function impactSolde(type: TypeMouvementCaisse, montant: number): number {
  if (!Number.isInteger(montant) || montant < 0) {
    throw new Error("Le montant doit être un entier positif ou nul en DZD.");
  }
  switch (sensMouvement(type)) {
    case "entree":
      return montant;
    case "sortie":
      return -montant;
    case "neutre":
      return 0;
  }
}

export function soldeApres(
  soldeAvant: number,
  type: TypeMouvementCaisse,
  montant: number
): number {
  return soldeAvant + impactSolde(type, montant);
}

export interface MouvementPourCalcul {
  type: TypeMouvementCaisse;
  montant: number;
}

export interface SoldesCaisse {
  total: number;
  reserve: number;
  disponible: number;
}

export function calculerSoldes(
  mouvements: readonly MouvementPourCalcul[],
  soldeInitial = 0
): SoldesCaisse {
  let total = soldeInitial;
  let reserve = 0;
  for (const m of mouvements) {
    total = soldeApres(total, m.type, m.montant);
    if (m.type === "transfert_reserve") {
      reserve += m.montant;
    }
  }
  return { total, reserve, disponible: total - reserve };
}

export function formaterDA(montant: number): string {
  // Arrondi au centime AVANT le groupement. Sans lui, une moyenne comme
  // 9384.615384615385 sortait « 9 384.615 384 615 385 DA » : la regex
  // ci-dessous ne sait pas distinguer le point décimal et hachait les
  // décimales en paquets de trois, à l'écran comme dans un fichier exporté.
  // L'arrondi rend ce hachage impossible — il ne reste jamais trois chiffres
  // après le point. Les montants entiers, eux, sortent inchangés.
  const arrondi = Math.round(Math.abs(montant) * 100) / 100;
  // Le signe se décide APRÈS l'arrondi : -0,001 DA vaut 0 DA, pas « -0 DA ».
  const signe = montant < 0 && arrondi !== 0 ? "-" : "";
  const abs = arrondi
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${signe}${abs} DA`;
}
