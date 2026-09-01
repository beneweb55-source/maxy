/**
 * Utilitaire d'Auto-Catégorisation Intelligente (Category Guesser)
 * Analyse les termes saisis dans les champs "Désignation / Référence / Modèle / Marque"
 * pour suggérer automatiquement la catégorie et la grande famille appropriées.
 */

export interface SuggestionCategorie {
  familleNom: string;
  categorieNom: string;
  sousCategorieNom?: string;
  confiance: number; // 0 à 100
  motif: string;
}

interface RegleCategorie {
  famille: string;
  categorie: string;
  sousCategorie?: string;
  regex: RegExp;
  poids: number;
}

const REGLES_CATEGORISATION: RegleCategorie[] = [
  // 1. Laptops & Ultrabooks / Ordinateurs Portables
  {
    famille: "Informatique",
    categorie: "PC Portables",
    sousCategorie: "Laptops & Ultrabooks",
    regex: /\b(probook|elitebook|thinkpad|latitude|xps|macbook|macbook\s*(air|pro)|zenbook|inspiron\s*(13|14|15|16|laptop)|pavilion|vostro\s*(laptop|\d{4})|lifebook|yoga|ideapad|surface\s*(laptop|pro)|vivobook|expertbook|envy|spectre|legion|rog|tuf|omen|predator|swift|aspire|laptop|notebook|ultrabook)\b/i,
    poids: 95,
  },

  // 2. PC Fixes, Stations de Travail & SFF
  {
    famille: "Informatique",
    categorie: "PC Fixes",
    sousCategorie: "PC Fixes & Stations",
    regex: /\b(optiplex|prodesk|elitedesk|thinkcentre|precision\s*(tower|workstation|\d{4})|workstation|sff|tower|tour|micro\s*pc|mini\s*pc|usff|desktop|vostro\s*desktop|thinkstation|z240|z440|z840|veriton)\b/i,
    poids: 95,
  },

  // 3. Mémoire Vive / RAM
  {
    famille: "Composants",
    categorie: "Mémoire RAM",
    sousCategorie: "RAM (Mémoire)",
    regex: /\b(ddr3|ddr4|ddr5|sodimm|udimm|ecc\s*reg|ram\s*\d+g|\d+go?\s*ddr|\d+gb\s*ddr|kingston\s*fury|corsair\s*vengeance|crucial\s*ram|g\.skill)\b/i,
    poids: 90,
  },

  // 4. Stockage & Disques
  {
    famille: "Composants",
    categorie: "Stockage",
    sousCategorie: "Stockage & Disques",
    regex: /\b(nvme|ssd|hdd|sata|m\.2|pcie\s*gen|evo\s*(970|980|990)|barracuda|ironwolf|western\s*digital|crucial\s*(p2|p3|p5)|kingston\s*(kc|nv)|disque\s*dur|sandisk\s*ssd|wd\s*(blue|black|red|green)|seagate)\b/i,
    poids: 90,
  },

  // 5. Cartes Graphiques (GPU)
  {
    famille: "Composants",
    categorie: "Cartes Graphiques",
    sousCategorie: "Cartes Graphiques (GPU)",
    regex: /\b(geforce|rtx\s*\d{3,4}|gtx\s*\d{3,4}|radeon\s*rx|quadro|intel\s*arc|gpu|amd\s*rx\s*\d{3,4}|ti\s*(super)?|rtx\s*3060|rtx\s*3070|rtx\s*3080|rtx\s*4060|rtx\s*4070|rtx\s*4080|rtx\s*4090)\b/i,
    poids: 90,
  },

  // 6. Écrans & Moniteurs
  {
    famille: "Périphériques",
    categorie: "Écrans",
    sousCategorie: "Écrans & Moniteurs",
    regex: /\b(ultrasharp|thinkvision|prodisplay|moniteur|ecran|monitor|\d{2}\s*(pouces|inch|\")|(144hz|165hz|240hz|360hz)|(ips|va|oled|qled|curved|incurv(é|e))|(fhd|qhd|uhd|4k|2k)\s*monitor)\b/i,
    poids: 85,
  },

  // 7. Imprimantes & Scanners
  {
    famille: "Périphériques",
    categorie: "Imprimantes",
    sousCategorie: "Imprimantes & Scanners",
    regex: /\b(laserjet|laserjet\s*pro|ecotank|deskjet|brother\s*(dcp|hl|mfc)|zebra|imprimante|scanner|canon\s*pixma|epson\s*l|thermal\s*printer|ticket\s*caisse|code\s*barre\s*scanner)\b/i,
    poids: 90,
  },

  // 8. Processeurs (CPU)
  {
    famille: "Composants",
    categorie: "Processeurs",
    sousCategorie: "Processeurs (CPU)",
    regex: /\b(core\s*i[3579]|intel\s*core|ryzen\s*[3579]|xeon|threadripper|pentium|celeron|socket\s*lga|socket\s*am[45]|cpu\s*intel|cpu\s*amd)\b/i,
    poids: 85,
  },

  // 9. Réseau & Télécom
  {
    famille: "Réseau",
    categorie: "Réseau & Télécom",
    sousCategorie: "Réseau & Connectivité",
    regex: /\b(switch\s*(poe|gigabit|managed)?|routeur|firewall|access\s*point|point\s*d'acc(è|e)s|ubiquiti|unifi|cisco|mikrotik|tp-link\s*(sg|omada)|d-link|rj45|c(â|a)ble\s*ethernet|cat6|cat7|sfp\+?)\b/i,
    poids: 85,
  },

  // 10. Accessoires, Câblerie & Connectique
  {
    famille: "Accessoires",
    categorie: "Accessoires",
    sousCategorie: "Accessoires & Périphériques",
    regex: /\b(clavier|souris|casque|webcam|chargeur|adaptateur|tapis\s*souris|station\s*d'accueil|docking\s*station|hub\s*usb|c(â|a)ble\s*(hdmi|displayport|vga|type-c))\b/i,
    poids: 80,
  },
];

/**
 * Devine la catégorie la plus pertinente en fonction du texte entré (marque, modèle, désignation).
 */
export function devinerCategorie(texte: string): SuggestionCategorie | null {
  if (!texte || typeof texte !== "string") return null;
  const nettoye = texte.trim();
  if (nettoye.length < 2) return null;

  let meilleureSuggestion: SuggestionCategorie | null = null;
  let meilleurPoids = 0;

  for (const regle of REGLES_CATEGORISATION) {
    if (regle.regex.test(nettoye)) {
      if (regle.poids > meilleurPoids) {
        meilleurPoids = regle.poids;
        meilleureSuggestion = {
          familleNom: regle.famille,
          categorieNom: regle.categorie,
          sousCategorieNom: regle.sousCategorie,
          confiance: regle.poids,
          motif: `Correspondance détectée sur « ${regle.categorie} »`,
        };
      }
    }
  }

  return meilleureSuggestion;
}
