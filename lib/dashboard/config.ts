import type { Role } from "@prisma/client";

export type FormatValeur = "da" | "jours" | "nombre";

export interface DefinitionKpi {
  libelle: string;
  format: FormatValeur;
  variationInversee?: boolean;
  comparaison?: boolean;
}

export const CATALOGUE_KPI = {
  benefice_mois: { libelle: "Bénéfice du mois", format: "da", comparaison: true },
  cash_disponible: { libelle: "Cash disponible", format: "da", comparaison: true },
  valeur_stock: { libelle: "Valeur du stock", format: "da", comparaison: true },
  temps_stock_moyen: {
    libelle: "Temps de stock moyen",
    format: "jours",
    variationInversee: true,
    comparaison: true,
  },
  ca_mois: { libelle: "Chiffre d'affaires du mois", format: "da", comparaison: true },
  nb_en_vente: { libelle: "Produits en vente", format: "nombre", comparaison: false },
  nb_en_stock: { libelle: "Produits en stock", format: "nombre", comparaison: false },
  valeur_en_vente: { libelle: "Valeur en vente", format: "da", comparaison: false },
  mon_ca_mois: { libelle: "Mes ventes du mois", format: "da", comparaison: true },
  mes_ventes_mois: { libelle: "Mes ventes (nombre)", format: "nombre", comparaison: true },
} satisfies Record<string, DefinitionKpi>;

export type CleKpi = keyof typeof CATALOGUE_KPI;

export type SourceGraphique = "benefices_6_mois" | "ca_6_mois";

export type SourceTableau =
  | "produits_en_vente"
  | "rapports_a_valider"
  | "produits_a_tarifer"
  | "dernieres_ventes";

export type TypeWidget =
  | "kpis"
  | "graphique_barres"
  | "donut_statuts"
  | "alertes"
  | "activites"
  | "tableau"
  | "actions_rapides";

export type TailleWidget = "petit" | "moyen" | "grand" | "pleine";

export const CLASSE_TAILLE: Record<TailleWidget, string> = {
  petit: "lg:col-span-3",
  moyen: "lg:col-span-6",
  grand: "lg:col-span-8",
  pleine: "lg:col-span-12",
};

interface WidgetBase {
  id: string;
  type: TypeWidget;
  titre?: string;
  taille: TailleWidget;
}

export interface ActionRapide {
  libelle: string;
  href: string;
  badge?: string;
}

export interface WidgetKpis extends WidgetBase {
  type: "kpis";
  cles: CleKpi[];
}
export interface WidgetGraphiqueBarres extends WidgetBase {
  type: "graphique_barres";
  source: SourceGraphique;
}
export interface WidgetDonut extends WidgetBase {
  type: "donut_statuts";
}
export interface WidgetAlertes extends WidgetBase {
  type: "alertes";
}
export interface WidgetActivites extends WidgetBase {
  type: "activites";
  limite?: number;
}
export interface WidgetTableau extends WidgetBase {
  type: "tableau";
  source: SourceTableau;
}
export interface WidgetActions extends WidgetBase {
  type: "actions_rapides";
  actions: ActionRapide[];
}

export type Widget =
  | WidgetKpis
  | WidgetGraphiqueBarres
  | WidgetDonut
  | WidgetAlertes
  | WidgetActivites
  | WidgetTableau
  | WidgetActions;

export interface ConfigDashboard {
  titre: string;
  widgets: Widget[];
  modules: string[];
  filtres: string[];
}

const CONFIG_GERANT: ConfigDashboard = {
  titre: "Tableau de bord — Gérant",
  modules: ["arrivages", "rapports", "inventaire", "ventes", "caisse"],
  filtres: [],
  widgets: [
    {
      id: "kpi-pilotage",
      type: "kpis",
      taille: "pleine",
      cles: ["nb_en_stock", "benefice_mois", "cash_disponible", "valeur_stock", "temps_stock_moyen"],
    },
    {
      id: "actions-gerant",
      type: "actions_rapides",
      titre: "Actions rapides",
      taille: "pleine",
      actions: [
        { libelle: "Créer un arrivage", href: "/arrivages/nouveau" },
        { libelle: "Ajouter un produit", href: "/inventaire?ajouter=1" },
        { libelle: "Valider les rapports", href: "/rapports", badge: "rapports_a_valider" },
        { libelle: "Fixer les prix", href: "/inventaire?statuts=ok", badge: "produits_a_tarifer" },
        { libelle: "Gérer la caisse", href: "/caisse" },
        { libelle: "Administration", href: "/administration" },
      ],
    },
    {
      id: "rapports-a-valider",
      type: "tableau",
      titre: "Rapports à valider",
      taille: "moyen",
      source: "rapports_a_valider",
    },
    {
      id: "produits-a-tarifer",
      type: "tableau",
      titre: "Produits à tarifer",
      taille: "moyen",
      source: "produits_a_tarifer",
    },
    {
      id: "benefices",
      type: "graphique_barres",
      titre: "Bénéfice — 6 derniers mois",
      taille: "moyen",
      source: "benefices_6_mois",
    },
    {
      id: "donut",
      type: "donut_statuts",
      titre: "Stock par statut",
      taille: "moyen",
    },
    { id: "alertes", type: "alertes", titre: "Alertes", taille: "moyen" },
    {
      id: "activites",
      type: "activites",
      titre: "Dernières activités",
      taille: "moyen",
      limite: 10,
    },
  ],
};

const CONFIG_DEV: ConfigDashboard = {
  titre: "Tableau de bord — Ventes",
  modules: ["ventes", "inventaire", "caisse"],
  filtres: [],
  widgets: [
    {
      id: "kpi-ventes",
      type: "kpis",
      taille: "pleine",
      cles: ["nb_en_vente", "valeur_en_vente", "mon_ca_mois", "cash_disponible"],
    },
    {
      id: "actions-dev",
      type: "actions_rapides",
      titre: "Actions rapides",
      taille: "pleine",
      actions: [
        { libelle: "Enregistrer une vente", href: "/ventes", badge: "en_vente" },
        { libelle: "Consulter l'inventaire", href: "/inventaire" },
      ],
    },
    {
      id: "en-vente",
      type: "tableau",
      titre: "Produits en vente",
      taille: "moyen",
      source: "produits_en_vente",
    },
    {
      id: "ca",
      type: "graphique_barres",
      titre: "Chiffre d'affaires — 6 derniers mois",
      taille: "moyen",
      source: "ca_6_mois",
    },
    {
      id: "dernieres-ventes",
      type: "tableau",
      titre: "Dernières ventes",
      taille: "moyen",
      source: "dernieres_ventes",
    },
    {
      id: "activites",
      type: "activites",
      titre: "Dernières activités",
      taille: "moyen",
      limite: 10,
    },
  ],
};

export const CONFIG_FALLBACK: ConfigDashboard = {
  titre: "Tableau de bord",
  modules: ["inventaire"],
  filtres: [],
  widgets: [
    { id: "donut", type: "donut_statuts", titre: "Stock par statut", taille: "moyen" },
    { id: "alertes", type: "alertes", titre: "Alertes", taille: "moyen" },
    {
      id: "activites",
      type: "activites",
      titre: "Dernières activités",
      taille: "pleine",
      limite: 10,
    },
  ],
};

export const CONFIGS_DASHBOARD: Partial<Record<Role, ConfigDashboard>> = {
  gerant: CONFIG_GERANT,
  dev: CONFIG_DEV,
};

export function configPourRole(role: Role): ConfigDashboard {
  return CONFIGS_DASHBOARD[role] ?? CONFIG_FALLBACK;
}
