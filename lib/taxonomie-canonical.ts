/**
 * TAXONOMIE CANONIQUE — Source unique de vérité pour les noms de familles / catégories.
 *
 * Tous les moteurs de classification (category-guesser, auto-classify-import,
 * taxonomie legacy, classify route) doivent importer leurs noms d'ici.
 *
 * Les noms ci-dessous correspondent exactement aux catégories créées en base
 * par la route POST /api/admin/migration/classify (TREE).
 */

export interface NoeudTaxonomie {
  famille: string;
  categorie: string;
  sousCategorie?: string;
}

// ─── Noms canoniques des familles (niveau racine) ───
export const FAMILLES = {
  INFORMATIQUE: "ORDINATEURS",
  SERVEURS: "SERVEURS",
  STOCKAGE: "STOCKAGE",
  MEMOIRE: "MÉMOIRE",
  COMPOSANTS: "COMPOSANTS INTERNES",
  PERIPHERIQUES: "PÉRIPHÉRIQUES",
  ALIMENTATION: "ALIMENTATION & CÂBLES",
  IMPRESSION: "IMPRESSION",
  RESEAU: "RÉSEAU & INFRASTRUCTURE",
} as const;

// ─── Règles de classification par regex (pour auto-suggestion) ───
// Chaque règle mappe un pattern texte vers un noeud taxonomy canonical.
export interface RegleClassification {
  famille: string;
  categorie: string;
  sousCategorie?: string;
  regex: RegExp;
  poids: number;
}

export const REGLES_CLASSIFICATION: RegleClassification[] = [
  // Laptops & Ultrabooks
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "PC PORTABLES",
    sousCategorie: "Laptops & Ultrabooks",
    regex: /\b(probook|elitebook|thinkpad|latitude|xps|macbook|macbook\s*(air|pro)|zenbook|inspiron\s*(13|14|15|16|laptop)|pavilion|vostro\s*(laptop|\d{4})|lifebook|yoga|ideapad|surface\s*(laptop|pro)|vivobook|expertbook|envy|spectre|legion|rog|tuf|omen|predator|swift|aspire|laptop|notebook|ultrabook)\b/i,
    poids: 95,
  },
  // PC Fixes & Stations
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "PC DE BUREAU",
    sousCategorie: "PC Fixes & Stations",
    regex: /\b(optiplex|prodesk|elitedesk|thinkcentre|precision\s*(tower|workstation|\d{4})|workstation|sff|tower|tour|micro\s*pc|mini\s*pc|usff|desktop|vostro\s*desktop|thinkstation|z240|z440|z840|veriton)\b/i,
    poids: 95,
  },
  // Mini PC
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "MINI PC",
    regex: /\b(mini\s*pc|tiny|micro\s*pc|nuc|beelink|minisforum)\b/i,
    poids: 92,
  },
  // All-in-One
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "ALL-IN-ONE",
    regex: /\b(all[\s-]*in[\s-]*one|aio|tout[\s-]*en[\s-]*un|imac)\b/i,
    poids: 90,
  },
  // Terminaux POS
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "TERMINAUX POS",
    regex: /\b(pos|caisse|tiroir[\s-]*caisse|douchette|lecteur\s*code[\s-]*barre|terminal\s*tactile|afficheur\s*client|aures|tm-t20|tm-t88|bixolon|xprinter|sunmi)\b/i,
    poids: 88,
  },
  // Mémoire RAM — Mini PC & PC Portable (SODIMM)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "RAM PORTABLE",
    sousCategorie: "Mini PC & PC Portable (SODIMM)",
    regex: /\b(sodimm|laptop\s*ram|ram\s*laptop|ram\s*mini\s*pc|ddr[345]\s*sodimm)\b/i,
    poids: 95,
  },
  // Mémoire RAM — PC Bureau (UDIMM/DIMM)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "RAM DESKTOP",
    sousCategorie: "PC Bureau (UDIMM)",
    regex: /\b(udimm|dimm|desktop\s*ram|ram\s*pc\s*(bureau|fixe)|rdimm|lrdimm|ecc\s*reg|kingston\s*fury|corsair\s*vengeance|crucial\s*ram|g\.skill)\b/i,
    poids: 93,
  },
  // Mémoire RAM — générique (fallback)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "RAM DESKTOP",
    sousCategorie: "PC Bureau (UDIMM)",
    regex: /\b(ddr[345]|ram\s*\d+g|\d+go?\s*ddr|\d+gb\s*ddr)\b/i,
    poids: 85,
  },
  // Serveurs
  {
    famille: FAMILLES.SERVEURS,
    categorie: "SERVEURS RACK",
    regex: /\b(serveur|proliant|poweredge|thinksystem|primergy|dl380|dl360|dl20|r730|r740|r630|r640|r720|r710|1u|2u|4u|rack)\b/i,
    poids: 92,
  },
  // Stockage SSD
  {
    famille: FAMILLES.STOCKAGE,
    categorie: "SSD",
    sousCategorie: "NVMe",
    regex: /\b(nvme|ssd|m\.2|pcie\s*gen|evo\s*(970|980|990)|crucial\s*(p2|p3|p5)|kingston\s*(kc|nv))\b/i,
    poids: 90,
  },
  // Stockage HDD
  {
    famille: FAMILLES.STOCKAGE,
    categorie: "DISQUES DURS",
    sousCategorie: "SATA",
    regex: /\b(hdd|sata|disque\s*dur|barracuda|ironwolf|western\s*digital|wd\s*(blue|black|red|green)|seagate)\b/i,
    poids: 88,
  },
  // Cartes Graphiques
  {
    famille: FAMILLES.COMPOSANTS,
    categorie: "CARTES GRAPHIQUES",
    regex: /\b(geforce|rtx\s*\d{3,4}|gtx\s*\d{3,4}|radeon\s*rx|quadro|intel\s*arc|gpu|amd\s*rx\s*\d{3,4}|ti\s*(super)?)\b/i,
    poids: 90,
  },
  // Processeurs
  {
    famille: FAMILLES.COMPOSANTS,
    categorie: "PROCESSEURS",
    regex: /\b(core\s*i[3579]|intel\s*core|ryzen\s*[3579]|xeon|threadripper|pentium|celeron|socket\s*lga|socket\s*am[45]|cpu\s*intel|cpu\s*amd)\b/i,
    poids: 88,
  },
  // Écrans
  {
    famille: FAMILLES.PERIPHERIQUES,
    categorie: "ÉCRANS",
    regex: /\b(ultrasharp|thinkvision|prodisplay|moniteur|ecran|monitor|\d{2}\s*(pouces|inch|\")|(144hz|165hz|240hz|360hz)|(ips|va|oled|qled|curved|incurv(é|e))|(fhd|qhd|uhd|4k|2k)\s*monitor)\b/i,
    poids: 85,
  },
  // Imprimantes
  {
    famille: FAMILLES.IMPRESSION,
    categorie: "IMPRIMANTES",
    regex: /\b(laserjet|laserjet\s*pro|ecotank|deskjet|brother\s*(dcp|hl|mfc)|zebra|imprimante|scanner|canon\s*pixma|epson\s*l|thermal\s*printer|ticket\s*caisse)\b/i,
    poids: 90,
  },
  // Consommables
  {
    famille: FAMILLES.IMPRESSION,
    categorie: "CONSOMMABLES",
    regex: /\b(toner|cartouche|tambour|drum|ruban|q2612a|cb435a|ce285a|cf217a|cf283a|tn-?[0-9]{3,4})\b/i,
    poids: 90,
  },
  // Réseau
  {
    famille: FAMILLES.RESEAU,
    categorie: "SWITCHES",
    regex: /\b(switch\s*(poe|gigabit|managed)?|routeur|firewall|access\s*point|point\s*d'acc(è|e)s|ubiquiti|unifi|cisco|mikrotik|tp-link\s*(sg|omada)|d-link|rj45|c(â|a)ble\s*ethernet|cat6|cat7|sfp\+?)\b/i,
    poids: 85,
  },
  // Chargeurs & Câbles
  {
    famille: FAMILLES.ALIMENTATION,
    categorie: "CHARGEURS PC PORTABLE",
    regex: /\b(chargeur|adaptateur|bloc\s*d'alimentation|45w|65w|90w|135w|170w|230w|power\s*adapter)\b/i,
    poids: 82,
  },
  // Accessoires
  {
    famille: FAMILLES.PERIPHERIQUES,
    categorie: "CLAVIERS & SOURIS",
    regex: /\b(clavier|souris|casque|webcam|tapis\s*souris|station\s*d'accueil|docking\s*station|hub\s*usb|c(â|a)ble\s*(hdmi|displayport|vga|type-c))\b/i,
    poids: 80,
  },
];

/**
 * Devine la catégorie canonical en fonction du texte entré.
 * Retourne les noms exacts de la base de données.
 */
export function devinerCategorie(texte: string): NoeudTaxonomie | null {
  if (!texte || typeof texte !== "string") return null;
  const nettoye = texte.trim();
  if (nettoye.length < 2) return null;

  let meilleur: NoeudTaxonomie | null = null;
  let meilleurPoids = 0;

  for (const regle of REGLES_CLASSIFICATION) {
    if (regle.regex.test(nettoye) && regle.poids > meilleurPoids) {
      meilleurPoids = regle.poids;
      meilleur = {
        famille: regle.famille,
        categorie: regle.categorie,
        sousCategorie: regle.sousCategorie,
      };
    }
  }

  return meilleur;
}
