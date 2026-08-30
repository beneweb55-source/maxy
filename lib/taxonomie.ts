import { Produit } from "@prisma/client";

export type TaxonomieResult = {
  famille: string;
  categorie: string;
  sousCategorie: string;
  iconeFamille: string;
};

export type NoeudTaxonomie = {
  nom: string;
  icone?: string;
  enfants?: Record<string, NoeudTaxonomie>;
  count?: number;
};

// Expressions régulières simplifiées pour détecter les familles
const match = (texte: string, motsCles: string[]) => {
  const str = texte.toLowerCase();
  return motsCles.some(mot => str.includes(mot.toLowerCase()));
};

export function classifierProduit(produit: Partial<Produit>): TaxonomieResult {
  const ref = (produit.reference || "").toLowerCase();
  const cat = (produit.categorie || "").toLowerCase();
  const nom = (produit.code_interne || "").toLowerCase(); // ou autre champ indicatif
  
  const complet = `${ref} ${cat} ${nom}`;

  // 1. Ordinateurs
  if (match(complet, ["laptop", "thinkpad", "latitude", "elitebook", "macbook", "portable"])) {
    let sousCat = "Autres Portables";
    if (match(complet, ["lenovo", "thinkpad"])) sousCat = "Lenovo";
    else if (match(complet, ["dell", "latitude", "xps"])) sousCat = "Dell";
    else if (match(complet, ["hp", "elitebook", "probook"])) sousCat = "HP";
    else if (match(complet, ["apple", "mac", "macbook"])) sousCat = "Apple";
    
    return { famille: "Ordinateurs", categorie: "PC Portables", sousCategorie: sousCat, iconeFamille: "IconeTableauDeBord" };
  }
  
  if (match(complet, ["pc bureau", "ordinateur de bureau", "mini pc", "ssf", "all in one", "station de travail", "workstation"])) {
    let sousCat = "Tour Standard";
    if (match(complet, ["mini pc", "tiny", "micro"])) sousCat = "Mini PC";
    else if (match(complet, ["sff", "ssf"])) sousCat = "Format SFF";
    else if (match(complet, ["all in one", "aio"])) sousCat = "All in One";
    else if (match(complet, ["station", "workstation"])) sousCat = "Station de travail";
    
    return { famille: "Ordinateurs", categorie: "PC Fixes & Stations", sousCategorie: sousCat, iconeFamille: "IconeTableauDeBord" };
  }

  // 2. Serveurs & Réseau
  if (match(complet, ["serveur", "server", "rack", "tour", "proliant", "poweredge"])) {
    let sousCat = "Autres Serveurs";
    if (match(complet, ["rack"])) sousCat = "Serveurs Rack";
    else if (match(complet, ["tour"])) sousCat = "Serveurs Tour";
    else if (match(complet, ["lame", "blade"])) sousCat = "Serveurs Lames";
    
    return { famille: "Serveurs & Réseau", categorie: "Serveurs", sousCategorie: sousCat, iconeFamille: "IconeBaseDeDonnees" };
  }
  if (match(complet, ["switch", "routeur", "pdu", "reseau", "aruba", "cisco", "fortinet"])) {
    return { famille: "Serveurs & Réseau", categorie: "Équipement Réseau", sousCategorie: "Switchs & Routeurs", iconeFamille: "IconeBaseDeDonnees" };
  }

  // 3. Stockage
  if (match(complet, ["ssd", "nvme"])) {
    let sousCat = "SSD Divers";
    if (match(complet, ["sata"])) sousCat = "SSD SATA";
    else if (match(complet, ["sas"])) sousCat = "SSD SAS";
    else if (match(complet, ["nvme", "m.2", "pcie"])) sousCat = "SSD NVMe";
    
    return { famille: "Stockage", categorie: "SSD", sousCategorie: sousCat, iconeFamille: "IconeArchive" };
  }
  if (match(complet, ["hdd", "disque dur", "sata", "sas"])) { // Après SSD pour que SSD SATA prime
    let sousCat = "HDD Divers";
    if (match(complet, ["sata"])) sousCat = "HDD SATA";
    else if (match(complet, ["sas"])) sousCat = "HDD SAS";
    
    return { famille: "Stockage", categorie: "Disque Dur (HDD)", sousCategorie: sousCat, iconeFamille: "IconeArchive" };
  }

  // 4. Composants
  if (match(complet, ["ram", "ddr", "mémoire", "memoire", "pc4-", "pc3-"])) {
    let sousCat = "Autres RAM";
    if (match(complet, ["ddr4", "pc4-"])) sousCat = "RAM DDR4";
    else if (match(complet, ["ddr3", "pc3-"])) sousCat = "RAM DDR3";
    else if (match(complet, ["ecc"])) sousCat = "RAM ECC";
    
    return { famille: "Composants", categorie: "Mémoire RAM", sousCategorie: sousCat, iconeFamille: "IconeReglages" };
  }
  if (match(complet, ["cpu", "processeur", "intel", "xeon", "amd", "ryzen", "core"])) {
    let sousCat = "Autres CPU";
    if (match(complet, ["intel", "xeon", "core"])) sousCat = "Processeurs Intel";
    else if (match(complet, ["amd", "ryzen", "epyc"])) sousCat = "Processeurs AMD";
    
    return { famille: "Composants", categorie: "Processeurs (CPU)", sousCategorie: sousCat, iconeFamille: "IconeReglages" };
  }
  if (match(complet, ["carte graphique", "gpu", "nvidia", "radeon", "carte raid", "raid", "hba"])) {
    let sousCat = "Autres Cartes";
    if (match(complet, ["raid", "hba"])) sousCat = "Contrôleurs Raid/HBA";
    else if (match(complet, ["carte graphique", "gpu", "nvidia", "radeon"])) sousCat = "Cartes Graphiques";
    
    return { famille: "Composants", categorie: "Cartes & Extensions", sousCategorie: sousCat, iconeFamille: "IconeReglages" };
  }

  // 5. Énergie & Accessoires
  if (match(complet, ["chargeur", "alimentation", "power supply", "psu"])) {
    let sousCat = "Alimentations";
    if (match(complet, ["chargeur"])) sousCat = "Chargeurs PC";
    else if (match(complet, ["serveur"])) sousCat = "Alimentations Serveur";
    
    return { famille: "Énergie & Accessoires", categorie: "Alimentation", sousCategorie: sousCat, iconeFamille: "IconePlus" }; // Plus as lightning replacement for now
  }
  if (match(complet, ["clavier", "souris", "ecran", "écran", "monitor", "station d'accueil", "dock", "cable", "câble", "adaptateur", "adapter"])) {
    let sousCat = "Accessoires Divers";
    if (match(complet, ["ecran", "écran", "monitor"])) sousCat = "Écrans";
    else if (match(complet, ["clavier", "souris"])) sousCat = "Claviers & Souris";
    else if (match(complet, ["station d'accueil", "dock"])) sousCat = "Stations d'accueil";
    else if (match(complet, ["cable", "câble", "adaptateur", "adapter"])) sousCat = "Câbles & Adaptateurs";
    
    return { famille: "Énergie & Accessoires", categorie: "Périphériques", sousCategorie: sousCat, iconeFamille: "IconeCurseurs" };
  }

  // 6. Impression
  if (match(complet, ["imprimante", "printer", "toner", "encre", "cartouche", "epson", "canon"])) {
    let sousCat = "Accessoires Impression";
    if (match(complet, ["imprimante", "printer"])) sousCat = "Imprimantes";
    else if (match(complet, ["toner", "encre", "cartouche"])) sousCat = "Consommables";
    
    return { famille: "Impression", categorie: "Imprimantes & Consommables", sousCategorie: sousCat, iconeFamille: "IconeRapport" }; // Rapport for document/printer
  }

  // Fallback
  return { famille: "Divers", categorie: "Autres Équipements", sousCategorie: "Non Classé", iconeFamille: "IconeInfo" };
}
