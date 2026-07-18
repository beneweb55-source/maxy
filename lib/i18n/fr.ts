import type { Dictionnaire } from "./types";

// Dictionnaire français — langue de référence (source des libellés d'origine).
// Chaque écran possède son namespace. Pour ajouter des traductions, complétez
// le namespace correspondant ici ET dans `en.ts` avec les mêmes clés.
export const fr = {
  commun: {
    enregistrer: "Enregistrer",
    annuler: "Annuler",
    confirmer: "Confirmer",
    supprimer: "Supprimer",
    modifier: "Modifier",
    fermer: "Fermer",
    retour: "Retour",
    rechercher: "Rechercher",
    chargement: "Chargement…",
    oui: "Oui",
    non: "Non",
    serveurInjoignable: "Impossible de joindre le serveur.",
  },
  langue: {
    libelle: "Langue",
    fr: "Français",
    en: "English",
  },
  roles: {
    gerant: "Gérant",
    technicien: "Technicien",
    dev: "Dev",
  },
  statuts: {
    recu: "Reçu",
    en_test: "En test",
    ok: "OK",
    a_reparer: "À réparer",
    manque_piece: "Manque pièce",
    hs: "HS",
    en_vente: "En vente",
    vendu: "Vendu",
    a_jeter: "À jeter",
    aJeterTitre: "Produit HS non récupérable pour pièces",
  },
  statutsLot: {
    en_cours_de_test: "En cours de test",
    teste: "Testé",
    valide: "Validé",
  },
  placeholdersNote: {
    a_reparer: "Décrivez le défaut à réparer (obligatoire)",
    manque_piece: "Précisez la pièce manquante (obligatoire)",
    hs: "Expliquez pourquoi le produit est HS (obligatoire)",
  },
  nav: {
    navigation: "Navigation",
    dashboard: "Dashboard",
    arrivages: "Arrivages",
    inventaire: "Inventaire",
    rapports: "Rapports",
    ventes: "Ventes",
    caisse: "Caisse",
    administration: "Administration",
  },
  entete: {
    titrePlateforme: "Plateforme de gestion de Stock / Revente Solution Maxy",
    ouvrirMenu: "Ouvrir le menu",
    fermerMenu: "Fermer le menu",
    deconnexion: "Déconnexion",
  },
  connexion: {
    sousTitre: "Plateforme de gestion de Stock / Revente Solution Maxy",
    identifiant: "Identifiant",
    motDePasse: "Mot de passe",
    seConnecter: "Se connecter",
    connexionEnCours: "Connexion…",
    erreurDefaut: "Erreur de connexion. Réessayez.",
    serveurInjoignable: "Impossible de joindre le serveur. Vérifiez votre connexion.",
  },
} satisfies Dictionnaire;
