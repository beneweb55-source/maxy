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

// ─── Noms canoniques des familles (niveau racine) — EXACTEMENT comme le TREE dans apply_classification.ts ───
export const FAMILLES = {
  INFORMATIQUE: "ORDINATEURS",
  SERVEURS: "SERVEURS & INFRASTRUCTURE",
  STOCKAGE: "STOCKAGE",
  MEMOIRE: "MÉMOIRE & PROCESSEURS",
  COMPOSANTS: "COMPOSANTS & CARTES D'EXTENSION",
  PERIPHERIQUES: "PÉRIPHÉRIQUES & CONNECTIQUE",
  ALIMENTATION: "ÉLECTRICITÉ & ALIMENTATION",
  IMPRESSION: "IMPRESSION & CONSOMMABLES",
  RESEAU: "RÉSEAU ACTIF & COMMUTATION",
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
  // ─── ORDINATEURS ───
  // Laptops & Ultrabooks
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "PC Portables",
    sousCategorie: "Laptops & Ultrabooks",
    regex: /\b(probook|elitebook|thinkpad|latitude|xps|macbook|macbook\s*(air|pro)|zenbook|inspiron\s*(13|14|15|16|laptop)|pavilion|vostro\s*(laptop|\d{4})|lifebook|yoga|ideapad|surface\s*(laptop|pro)|vivobook|expertbook|envy|spectre|legion|rog|tuf|omen|predator|swift|aspire|laptop|notebook|ultrabook)\b/i,
    poids: 95,
  },
  // PC Fixes & Stations
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "PC Fixes & Tout-en-un",
    sousCategorie: "Tours & Formats SFF",
    regex: /\b(optiplex|prodesk|elitedesk|thinkcentre|precision\s*(tower|workstation|\d{4})|workstation|sff|tower|tour|desktop|vostro\s*desktop|thinkstation|z240|z440|z840|veriton)\b/i,
    poids: 93,
  },
  // Mini PC
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "PC Fixes & Tout-en-un",
    sousCategorie: "Mini PC & Clients Légers",
    regex: /\b(mini\s*pc|tiny|micro\s*pc|nuc|beelink|minisforum)\b/i,
    poids: 92,
  },
  // All-in-One
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "PC Fixes & Tout-en-un",
    sousCategorie: "Tout-en-un (All-in-One)",
    regex: /\b(all[\s-]*in[\s-]*one|aio|tout[\s-]*en[\s-]*un|imac)\b/i,
    poids: 90,
  },
  // Terminaux POS
  {
    famille: FAMILLES.INFORMATIQUE,
    categorie: "Matériel Point de Vente (POS)",
    sousCategorie: "Terminaux & Caisses Tactiles (TPV)",
    regex: /\b(pos|caisse|tiroir[\s-]*caisse|douchette|lecteur\s*code[\s-]*barre|terminal\s*tactile|afficheur\s*client|aures|tm-t20|tm-t88|bixolon|xprinter|sunmi)\b/i,
    poids: 88,
  },

  // ─── SERVEURS ───
  // Serveurs Rack
  {
    famille: FAMILLES.SERVEURS,
    categorie: "Serveurs",
    sousCategorie: "Serveurs Rack (1U / 2U / 4U)",
    regex: /\b(proliant\s*dl|poweredge\s*r|thinksystem\s*sr|primergy|dl380|dl360|dl20|r730|r740|r630|r640|r720|r710|1u|2u|4u|rack)\b/i,
    poids: 94,
  },
  // Serveurs Tour
  {
    famille: FAMILLES.SERVEURS,
    categorie: "Serveurs",
    sousCategorie: "Serveurs Tour",
    regex: /\b(proliant\s*ml|ml350|ml110|ml10|t440|t430|t330|t340)\b/i,
    poids: 94,
  },

  // ─── MÉMOIRE & PROCESSEURS ───
  // RAM SODIMM (laptop/mini PC)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "Mémoire Vive (RAM)",
    sousCategorie: "RAM PC Portable (SO-DIMM)",
    regex: /\b(sodimm|laptop\s*ram|ram\s*laptop|ram\s*mini\s*pc|ddr[345]\s*sodimm)\b/i,
    poids: 95,
  },
  // RAM UDIMM/DIMM (desktop)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "Mémoire Vive (RAM)",
    sousCategorie: "RAM PC Fixe (UDIMM / Non-ECC)",
    regex: /\b(udimm|dimm|desktop\s*ram|ram\s*pc\s*(bureau|fixe)|ecc\s*reg|kingston\s*fury|corsair\s*vengeance|crucial\s*ram|g\.skill)\b/i,
    poids: 93,
  },
  // RAM RDIMM (serveur)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "Mémoire Vive (RAM)",
    sousCategorie: "RAM Serveur (ECC Registered / RDIMM)",
    regex: /\b(rdimm|lrdimm)\b/i,
    poids: 94,
  },
  // RAM générique (fallback)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "Mémoire Vive (RAM)",
    sousCategorie: "RAM PC Fixe (UDIMM / Non-ECC)",
    regex: /\b(ddr[345]\s*\d+\s*(go|gb)|\d+\s*(go|gb)\s*ddr[345]|ram\s*\d+\s*(go|gb))\b/i,
    poids: 85,
  },
  // Processeurs Serveur (Xeon / EPYC)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "Processeurs (CPU)",
    sousCategorie: "Processeurs Serveur (Intel Xeon / AMD EPYC)",
    regex: /\b(xeon|epyc)\b/i,
    poids: 92,
  },
  // Processeurs PC (Core i3/i5/i7/i9, Ryzen)
  {
    famille: FAMILLES.MEMOIRE,
    categorie: "Processeurs (CPU)",
    sousCategorie: "Processeurs PC (Intel Core / AMD Ryzen)",
    regex: /\b(core\s*i[3579]|intel\s*core|ryzen\s*[3579]|threadripper|pentium|celeron|socket\s*lga|socket\s*am[45]|cpu\s*intel|cpu\s*amd)\b/i,
    poids: 88,
  },

  // ─── COMPOSANTS & CARTES D'EXTENSION ───
  // Cartes Graphiques
  {
    famille: FAMILLES.COMPOSANTS,
    categorie: "Cartes Graphiques (GPU)",
    sousCategorie: "Cartes Graphiques Grand Public (GeForce / Radeon)",
    regex: /\b(geforce|rtx\s*\d{3,4}|gtx\s*\d{3,4}|radeon\s*rx|intel\s*arc|gpu|amd\s*rx\s*\d{3,4}|ti\s*(super)?)\b/i,
    poids: 90,
  },
  // Cartes Graphiques Pro
  {
    famille: FAMILLES.COMPOSANTS,
    categorie: "Cartes Graphiques (GPU)",
    sousCategorie: "Cartes Graphiques Professionnelles (Quadro / RTX Pro)",
    regex: /\b(quadro|p2000|p2200|p6000|a16)\b/i,
    poids: 91,
  },

  // ─── STOCKAGE ───
  // SSD NVMe
  {
    famille: FAMILLES.STOCKAGE,
    categorie: "Disques Flash (SSD)",
    sousCategorie: "Disques SSD M.2 NVMe & PCIe",
    regex: /\b(nvme|m\.2|pcie\s*gen|evo\s*(970|980|990)|crucial\s*(p2|p3|p5)|kingston\s*(kc|nv))\b/i,
    poids: 90,
  },
  // SSD SATA
  {
    famille: FAMILLES.STOCKAGE,
    categorie: "Disques Flash (SSD)",
    sousCategorie: "Disques SSD 2,5\" SATA",
    regex: /\b(ssd\s*(2\.5|sata|samsung|kingston|crucial|wd))\b/i,
    poids: 89,
  },
  // HDD
  {
    famille: FAMILLES.STOCKAGE,
    categorie: "Disques Durs Mécaniques (HDD)",
    sousCategorie: "Disques Durs SATA 3,5\" (Bureautique / NAS)",
    regex: /\b(hdd|disque\s*dur|barracuda|ironwolf|western\s*digital|wd\s*(blue|black|red|green)|seagate)\b/i,
    poids: 88,
  },

  // ─── PÉRIPHÉRIQUES & CONNECTIQUE ───
  // Écrans
  {
    famille: FAMILLES.PERIPHERIQUES,
    categorie: "Moniteurs & Affichage",
    sousCategorie: "Écrans & Moniteurs Bureautique / Pro",
    regex: /\b(ultrasharp|thinkvision|prodisplay|moniteur|ecran|monitor|\d{2}\s*(pouces|inch|\")|(144hz|165hz|240hz|360hz)|(ips|va|oled|qled|curved|incurv(é|e))|(fhd|qhd|uhd|4k|2k)\s*monitor)\b/i,
    poids: 85,
  },
  // Accessoires
  {
    famille: FAMILLES.PERIPHERIQUES,
    categorie: "Périphériques de Saisie",
    sousCategorie: "Claviers, Souris & Combos",
    regex: /\b(clavier|souris|casque|webcam|tapis\s*souris|station\s*d'accueil|docking\s*station|hub\s*usb|c(â|a)ble\s*(hdmi|displayport|vga|type-c))\b/i,
    poids: 80,
  },

  // ─── IMPRESSION & CONSOMMABLES ───
  // Imprimantes
  {
    famille: FAMILLES.IMPRESSION,
    categorie: "Imprimantes & Scanners",
    sousCategorie: "Imprimantes Laser & Multifonctions",
    regex: /\b(laserjet|laserjet\s*pro|ecotank|deskjet|brother\s*(dcp|hl|mfc)|zebra|imprimante|scanner|canon\s*pixma|epson\s*l|thermal\s*printer|ticket\s*caisse)\b/i,
    poids: 90,
  },
  // Consommables
  {
    famille: FAMILLES.IMPRESSION,
    categorie: "Consommables d'Impression",
    sousCategorie: "Toners & Tambours Laser",
    regex: /\b(toner|cartouche|tambour|drum|ruban|q2612a|cb435a|ce285a|cf217a|cf283a|tn-?[0-9]{3,4})\b/i,
    poids: 90,
  },

  // ─── RÉSEAU ACTIF & COMMUTATION ───
  {
    famille: FAMILLES.RESEAU,
    categorie: "Commutateurs & Routage",
    sousCategorie: "Switches Réseau (Manageables / PoE)",
    regex: /\b(switch\s*(poe|gigabit|managed)?|routeur|firewall|access\s*point|point\s*d'acc(è|e)s|ubiquiti|unifi|cisco|mikrotik|tp-link\s*(sg|omada)|d-link|rj45|c(â|a)ble\s*ethernet|cat6|cat7|sfp\+?)\b/i,
    poids: 85,
  },

  // ─── ÉLECTRICITÉ & ALIMENTATION ───
  // Chargeurs & Câbles
  {
    famille: FAMILLES.ALIMENTATION,
    categorie: "Chargeurs & Alimentation Externe",
    sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)",
    regex: /\b(chargeur|adaptateur|bloc\s*d'alimentation|45w|65w|90w|135w|170w|230w|power\s*adapter)\b/i,
    poids: 82,
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
