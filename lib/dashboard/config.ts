import type { Role } from "@prisma/client";

export type FormatValeur = "da" | "jours" | "nombre";

export interface DefinitionKpi {
  libelle: string;
  format: FormatValeur;
  variationInversee?: boolean;
  comparaison?: boolean;
}

export const CATALOGUE_KPI = {
  benefice_mois: { libelle: "dashboard.kpi.benefice_mois", format: "da", comparaison: true },
  cash_disponible: { libelle: "dashboard.kpi.cash_disponible", format: "da", comparaison: true },
  valeur_stock: { libelle: "dashboard.kpi.valeur_stock", format: "da", comparaison: true },
  temps_stock_moyen: {
    libelle: "dashboard.kpi.temps_stock_moyen",
    format: "jours",
    variationInversee: true,
    comparaison: true,
  },
  ca_mois: { libelle: "dashboard.kpi.ca_mois", format: "da", comparaison: true },
  nb_en_vente: { libelle: "dashboard.kpi.nb_en_vente", format: "nombre", comparaison: false },
  nb_en_stock: { libelle: "dashboard.kpi.nb_en_stock", format: "nombre", comparaison: false },
  valeur_en_vente: { libelle: "dashboard.kpi.valeur_en_vente", format: "da", comparaison: false },
  mon_ca_mois: { libelle: "dashboard.kpi.mon_ca_mois", format: "da", comparaison: true },
  mes_ventes_mois: { libelle: "dashboard.kpi.mes_ventes_mois", format: "nombre", comparaison: true },
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
  titre: "dashboard.titreGerant",
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
      titre: "dashboard.actionsRapides",
      taille: "pleine",
      actions: [
        { libelle: "dashboard.creerArrivage", href: "/arrivages/nouveau" },
        { libelle: "dashboard.ajouterProduit", href: "/inventaire?ajouter=1" },
        { libelle: "dashboard.validerRapports", href: "/rapports", badge: "rapports_a_valider" },
        { libelle: "dashboard.fixerPrix", href: "/inventaire?statuts=ok", badge: "produits_a_tarifer" },
        { libelle: "dashboard.gererCaisse", href: "/caisse" },
        { libelle: "dashboard.administration", href: "/administration" },
      ],
    },
    {
      id: "rapports-a-valider",
      type: "tableau",
      titre: "dashboard.rapportsAValider",
      taille: "moyen",
      source: "rapports_a_valider",
    },
    {
      id: "produits-a-tarifer",
      type: "tableau",
      titre: "dashboard.produitsATarifer",
      taille: "moyen",
      source: "produits_a_tarifer",
    },
    {
      id: "benefices",
      type: "graphique_barres",
      titre: "dashboard.benefice6Mois",
      taille: "moyen",
      source: "benefices_6_mois",
    },
    {
      id: "donut",
      type: "donut_statuts",
      titre: "dashboard.stockParStatut",
      taille: "moyen",
    },
    { id: "alertes", type: "alertes", titre: "dashboard.alertes", taille: "moyen" },
    {
      id: "activites",
      type: "activites",
      titre: "dashboard.activitesRecentes",
      taille: "moyen",
      limite: 10,
    },
  ],
};

const CONFIG_DEV: ConfigDashboard = {
  titre: "dashboard.titreDev",
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
      titre: "dashboard.actionsRapides",
      taille: "pleine",
      actions: [
        { libelle: "dashboard.enregistrerVente", href: "/ventes", badge: "en_vente" },
        { libelle: "dashboard.consulterInventaire", href: "/inventaire" },
      ],
    },
    {
      id: "en-vente",
      type: "tableau",
      titre: "dashboard.produitsEnVente",
      taille: "moyen",
      source: "produits_en_vente",
    },
    {
      id: "ca",
      type: "graphique_barres",
      titre: "dashboard.ca6Mois",
      taille: "moyen",
      source: "ca_6_mois",
    },
    {
      id: "dernieres-ventes",
      type: "tableau",
      titre: "dashboard.dernieresVentes",
      taille: "moyen",
      source: "dernieres_ventes",
    },
    {
      id: "activites",
      type: "activites",
      titre: "dashboard.activitesRecentes",
      taille: "moyen",
      limite: 10,
    },
  ],
};

export const CONFIG_FALLBACK: ConfigDashboard = {
  titre: "dashboard.titre",
  modules: ["inventaire"],
  filtres: [],
  widgets: [
    { id: "donut", type: "donut_statuts", titre: "dashboard.stockParStatut", taille: "moyen" },
    { id: "alertes", type: "alertes", titre: "dashboard.alertes", taille: "moyen" },
    {
      id: "activites",
      type: "activites",
      titre: "dashboard.activitesRecentes",
      taille: "pleine",
      limite: 10,
    },
  ],
};

// Social Media Manager : uniquement ce qui sert à la mise en avant des
// produits — pas de chiffres de caisse, d'achats ni d'alertes internes.
const CONFIG_SOCIAL: ConfigDashboard = {
  titre: "dashboard.titreProduits",
  modules: ["inventaire", "ventes", "caisse"],
  filtres: [],
  widgets: [
    {
      id: "kpi-social",
      type: "kpis",
      taille: "pleine",
      cles: ["nb_en_vente", "valeur_en_vente"],
    },
    {
      id: "en-vente",
      type: "tableau",
      titre: "dashboard.produitsEnVente",
      taille: "moyen",
      source: "produits_en_vente",
    },
    {
      id: "dernieres-ventes",
      type: "tableau",
      titre: "dashboard.dernieresVentes",
      taille: "moyen",
      source: "dernieres_ventes",
    },
  ],
};

export const CONFIGS_DASHBOARD: Partial<Record<Role, ConfigDashboard>> = {
  gerant: CONFIG_GERANT,
  dev: CONFIG_DEV,
  social_media: CONFIG_SOCIAL,
};

export function configPourRole(role: Role): ConfigDashboard {
  return CONFIGS_DASHBOARD[role] ?? CONFIG_FALLBACK;
}
