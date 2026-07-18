import type { Dictionnaire } from "./types";

// English dictionary. Keep the same key structure as `fr.ts`; any missing key
// falls back to the French value at runtime.
export const en = {
  commun: {
    enregistrer: "Save",
    annuler: "Cancel",
    confirmer: "Confirm",
    supprimer: "Delete",
    modifier: "Edit",
    fermer: "Close",
    retour: "Back",
    rechercher: "Search",
    chargement: "Loading…",
    oui: "Yes",
    non: "No",
    serveurInjoignable: "Unable to reach the server.",
  },
  langue: {
    libelle: "Language",
    fr: "Français",
    en: "English",
  },
  roles: {
    gerant: "Manager",
    technicien: "Technician",
    dev: "Dev",
  },
  nav: {
    navigation: "Navigation",
    dashboard: "Dashboard",
    arrivages: "Arrivals",
    inventaire: "Inventory",
    rapports: "Reports",
    ventes: "Sales",
    caisse: "Cash register",
    administration: "Administration",
  },
  entete: {
    titrePlateforme: "Solution Maxy — Stock / Resale Management Platform",
    ouvrirMenu: "Open menu",
    fermerMenu: "Close menu",
    deconnexion: "Log out",
  },
  connexion: {
    sousTitre: "Solution Maxy — Stock / Resale Management Platform",
    identifiant: "Username",
    motDePasse: "Password",
    seConnecter: "Log in",
    connexionEnCours: "Logging in…",
    erreurDefaut: "Login error. Please try again.",
    serveurInjoignable: "Unable to reach the server. Check your connection.",
  },
} satisfies Dictionnaire;
