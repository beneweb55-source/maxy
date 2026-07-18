import type { StatutProduit } from "@prisma/client";
import type {
  CleKpi,
  ConfigDashboard,
  SourceGraphique,
  SourceTableau,
} from "./config";

export interface Kpi {
  valeur: number;
  variation_pct: number | null;
}

export interface PointGraphique {
  label: string;
  valeur: number;
}

export interface DonneesGraphique {
  jour: PointGraphique[];
  mois: PointGraphique[];
  an: PointGraphique[];
}

export interface AlerteProduit {
  id: number;
  code_interne: string;
  reference: string;
  jours: number;
}

export interface Activite {
  type: "arrivage" | "statut" | "vente" | "caisse";
  message: string;
  qui: string;
  quand: string;
}

export interface LigneEnVente {
  id: number;
  code_interne: string;
  reference: string;
  prix_vente_fixe: number | null;
  marge_prevue: number;
  jours_en_vente: number;
}

export interface LigneRapport {
  lot_id: number;
  fournisseur: string;
  date_entree: string;
  nb_produits: number;
  decisions_prises: number;
  decisions_requises: number;
}

export interface LigneATarifer {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  prix_achat: number;
  cout_reparations: number;
}

export interface LigneVente {
  id: number;
  reference: string;
  prix_vente_reel: number;
  marge: number;
  vendeur: string;
  quand: string;
  annulee: boolean;
}

export interface TableauxDashboard {
  produits_en_vente?: LigneEnVente[];
  rapports_a_valider?: LigneRapport[];
  produits_a_tarifer?: LigneATarifer[];
  dernieres_ventes?: LigneVente[];
}

export interface DonneesDashboard {
  kpis: Partial<Record<CleKpi, Kpi>>;
  graphiques: Partial<Record<SourceGraphique, DonneesGraphique>>;
  stock_par_statut?: { statut: StatutProduit; nombre: number }[];
  alertes?: { stock_30j: AlerteProduit[]; manque_piece_14j: AlerteProduit[]; hs: AlerteProduit[] };
  activites?: Activite[];
  tableaux: TableauxDashboard;
  compteurs: Record<string, number>;
}

export interface ReponseDashboard {
  config: ConfigDashboard;
  donnees: DonneesDashboard;
}

export type { SourceTableau };
