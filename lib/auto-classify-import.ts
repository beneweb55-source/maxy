/**
 * MOTEUR INTELLIGENT DE CLASSIFICATION AUTOMATIQUE POUR L'IMPORTATION
 * Analyse les désignations brutes des fournisseurs (CSV / Excel) et déduit :
 * - Famille cible (noms canoniques = base de données)
 * - Catégorie cible
 * - Sous-catégorie cible
 * - Marque extraite
 * - Attributs techniques normalisés
 * - Score de confiance ("haut" | "moyen" | "faible") et flag de doute
 *
 * Les noms de familles/catégories sont importés depuis taxonomie-canonical.ts
 * pour garantir la cohérence avec la base de données et les autres moteurs.
 */

import { FAMILLES, devinerCategorie } from "./taxonomie-canonical";

export interface ClassificationImportResult {
  familleNom: string;
  categorieNom: string;
  sousCategorieNom?: string;
  cheminComplet: string;
  marque?: string;
  scoreConfiance: "haut" | "moyen" | "faible";
  doute: boolean;
  explication?: string;
  attributsExtraits: Record<string, any>;
}

const DICTIONNAIRE_MARQUES = [
  "Lenovo", "ThinkPad", "ThinkCentre", "IdeaPad", "Yoga", "Legion",
  "HP", "Hewlett Packard", "ProBook", "EliteBook", "ZBook", "Pavilion", "Omen", "ProDesk", "EliteDesk", "ProLiant",
  "Dell", "Latitude", "OptiPlex", "Precision", "Vostro", "XPS", "Alienware", "PowerEdge",
  "Apple", "MacBook", "iMac", "Mac Mini", "Mac Studio", "Mac Pro", "iPad", "iPhone",
  "Asus", "ROG", "TUF", "ZenBook", "VivoBook",
  "Acer", "Aspire", "Predator", "Nitro", "Swift",
  "Samsung", "Crucial", "Kingston", "Western Digital", "WD", "Seagate", "SanDisk", "Kioxia", "Toshiba", "Micron", "SK Hynix",
  "Intel", "AMD", "NVIDIA", "GeForce", "Radeon", "Quadro", "Ryzen", "Core",
  "Cisco", "Mikrotik", "Ubiquiti", "UniFi", "TP-Link", "D-Link", "Netgear", "Fortinet", "Aruba",
  "Epson", "Canon", "Brother", "Zebra", "Xprinter", "Bixolon", "Datalogic", "Honeywell", "Aures", "Elo", "Sunmi"
];

/**
 * Construit le chemin complet famille › catégorie › sous-catégorie
 */
function chemin(famille: string, categorie: string, sousCategorie?: string): string {
  return sousCategorie ? `${famille} › ${categorie} › ${sousCategorie}` : `${famille} › ${categorie}`;
}

export function autoClassifyProduct(designationBrute: string): ClassificationImportResult {
  if (!designationBrute || typeof designationBrute !== "string" || !designationBrute.trim()) {
    return {
      familleNom: FAMILLES.INFORMATIQUE,
      categorieNom: "PC PORTABLES",
      cheminComplet: chemin(FAMILLES.INFORMATIQUE, "PC PORTABLES"),
      scoreConfiance: "faible",
      doute: true,
      explication: "Désignation vide ou non renseignée",
      attributsExtraits: {},
    };
  }

  const texte = designationBrute.trim();
  const texteNorm = texte.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // 1. Extraction de la marque
  let marqueExtraite: string | undefined = undefined;
  for (const m of DICTIONNAIRE_MARQUES) {
    const reg = new RegExp(`\\b${m.toLowerCase()}\\b`, "i");
    if (reg.test(texteNorm)) {
      if (["thinkpad", "thinkcentre", "ideapad", "yoga", "legion"].includes(m.toLowerCase())) marqueExtraite = "Lenovo";
      else if (["probook", "elitebook", "zbook", "pavilion", "omen", "prodesk", "elitedesk", "proliant"].includes(m.toLowerCase())) marqueExtraite = "HP";
      else if (["latitude", "optiplex", "precision", "vostro", "xps", "alienware", "poweredge"].includes(m.toLowerCase())) marqueExtraite = "Dell";
      else if (["macbook", "imac", "mac mini", "mac studio", "mac pro"].includes(m.toLowerCase())) marqueExtraite = "Apple";
      else if (["wd", "western digital"].includes(m.toLowerCase())) marqueExtraite = "Western Digital";
      else marqueExtraite = m;
      break;
    }
  }

  // Attributs techniques extraits
  const attributs: Record<string, any> = {};
  if (marqueExtraite) attributs.marque = marqueExtraite;

  // Extraction RAM
  const matchRam = texte.match(/(\b[0-9]{1,3})\s*(go|gb|g)\s*(ram|ddr[345]|sodimm|udimm)?/i);
  if (matchRam && Number(matchRam[1]) >= 2 && Number(matchRam[1]) <= 512) {
    attributs.ram_taille = `${matchRam[1]} Go`;
  }

  // Extraction Stockage
  const matchStockage = texte.match(/(\b[0-9]{1,4})\s*(go|gb|to|tb)\s*(ssd|hdd|nvme|m\.2|sata)?/i);
  if (matchStockage && matchStockage[1] && matchStockage[2]) {
    const unite = matchStockage[2].toLowerCase().startsWith("t") ? "To" : "Go";
    attributs.capacite_stockage = `${matchStockage[1]} ${unite}`;
  }

  // Extraction Processeur
  const matchCpu = texte.match(/\b(i[3579][ -]?[0-9]{4,5}[a-z0-9]*|ryzen\s*[3579]\s*[0-9]{4}[a-z]*|xeon\s*[a-z0-9 -]+|m[1234]\s*(pro|max|ultra)?)\b/i);
  if (matchCpu) {
    attributs.cpu = matchCpu[0].toUpperCase();
  }

  // Extraction Watts
  const matchWatts = texte.match(/\b([0-9]{2,3})\s*w\b/i);

  // =========================================================================
  // RÈGLES DE CLASSIFICATION — noms canoniques depuis taxonomie-canonical.ts
  // =========================================================================

  // --- A. CHARGEURS & ALIMENTATION ---
  if (
    texteNorm.includes("chargeur") ||
    texteNorm.includes("adaptateur secteur") ||
    texteNorm.includes("bloc d'alimentation externe") ||
    (/\b(45w|65w|90w|135w|170w|230w)\b/i.test(texteNorm) && (texteNorm.includes("alim") || texteNorm.includes("embout") || texteNorm.includes("power adapter")))
  ) {
    if (matchWatts) attributs.puissance_w = `${matchWatts[1]}W`;
    return {
      familleNom: FAMILLES.ALIMENTATION,
      categorieNom: "CHARGEURS PC PORTABLE",
      sousCategorieNom: "Chargeurs PC Portables",
      cheminComplet: chemin(FAMILLES.ALIMENTATION, "CHARGEURS PC PORTABLE", "Chargeurs PC Portables"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme chargeur ou bloc d'alimentation",
      attributsExtraits: attributs,
    };
  }

  // --- B. MÉMOIRE VIVE (RAM) ---
  if (
    (/\b(ddr3|ddr4|ddr5|sodimm|udimm|rdimm|lrdimm)\b/i.test(texteNorm) ||
    texteNorm.includes("barrette") ||
    texteNorm.includes("memoire vive") ||
    (texteNorm.includes("ram") && /\b[0-9]{1,3}\s*(go|gb)\b/i.test(texteNorm))) &&
    !texteNorm.includes("laptop") && !texteNorm.includes("portable") && !texteNorm.includes("optiplex") && !texteNorm.includes("thinkpad")
  ) {
    const isSodimm = texteNorm.includes("sodimm") || texteNorm.includes("laptop") || texteNorm.includes("portable");
    const sousCat = isSodimm ? "RAM PC Portable (SO-DIMM)" : "RAM PC Fixe (DIMM)";
    return {
      familleNom: FAMILLES.MEMOIRE,
      categorieNom: "RAM DESKTOP",
      sousCategorieNom: sousCat,
      cheminComplet: chemin(FAMILLES.MEMOIRE, "RAM DESKTOP", sousCat),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme module de mémoire vive RAM",
      attributsExtraits: attributs,
    };
  }

  // --- C. STOCKAGE (SSD / HDD) ---
  if (
    (/\b(ssd|nvme|m\.2|pcie ssd|flash storage)\b/i.test(texteNorm) ||
    (/\b(hdd|disque dur|sata hdd|sas hdd|3\.5\"|2\.5\")\b/i.test(texteNorm) && !texteNorm.includes("thinkpad") && !texteNorm.includes("optiplex")))
  ) {
    const isSsd = /\b(ssd|nvme|m\.2|nand|pcie)\b/i.test(texteNorm);
    const isSas = texteNorm.includes("sas");
    const isM2 = texteNorm.includes("m.2") || texteNorm.includes("nvme");

    let sousCat: string;
    let categorieCible: string;
    if (isSsd) {
      categorieCible = "SSD";
      sousCat = isM2 ? "NVMe" : "SATA";
    } else {
      categorieCible = "DISQUES DURS";
      sousCat = isSas ? "SAS" : "SATA";
    }

    return {
      familleNom: FAMILLES.STOCKAGE,
      categorieNom: categorieCible,
      sousCategorieNom: sousCat,
      cheminComplet: chemin(FAMILLES.STOCKAGE, categorieCible, sousCat),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: `Détecté comme support de stockage (${isSsd ? "SSD" : "HDD"})`,
      attributsExtraits: attributs,
    };
  }

  // --- D. TERMINAUX POS ---
  if (
    texteNorm.includes("pos") ||
    texteNorm.includes("caisse") ||
    texteNorm.includes("tiroir-caisse") ||
    texteNorm.includes("tiroir caisse") ||
    texteNorm.includes("douchette") ||
    texteNorm.includes("lecteur code barre") ||
    texteNorm.includes("lecteur code-barre") ||
    texteNorm.includes("terminal tactile") ||
    texteNorm.includes("afficheur client") ||
    texteNorm.includes("aures") ||
    texteNorm.includes("tm-t20") ||
    texteNorm.includes("tm-t88") ||
    texteNorm.includes("bixolon")
  ) {
    return {
      familleNom: FAMILLES.INFORMATIQUE,
      categorieNom: "TERMINAUX POS",
      sousCategorieNom: "Terminaux Tactiles POS",
      cheminComplet: chemin(FAMILLES.INFORMATIQUE, "TERMINAUX POS", "Terminaux Tactiles POS"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme équipement de Point de Vente / Encaissement",
      attributsExtraits: attributs,
    };
  }

  // --- E. SERVEURS ---
  if (
    texteNorm.includes("serveur") ||
    texteNorm.includes("proliant") ||
    texteNorm.includes("poweredge") ||
    texteNorm.includes("thinksystem") ||
    texteNorm.includes("primergy") ||
    /\b(dl380|dl360|dl20|dl160|dl180|r730|r740|r630|r640|r720|r710|r530|r430|r330|r230)\b/i.test(texteNorm) ||
    /\b(ml350|ml110|ml10|ml30|t430|t440|t330|t340|t130|t140|st50)\b/i.test(texteNorm) ||
    (/\b(1u|2u|4u)\b/i.test(texteNorm) && (texteNorm.includes("rack") || texteNorm.includes("chassis")))
  ) {
    const isTour = /\b(ml350|ml110|ml10|ml30|t430|t440|t330|t340|t130|t140|st50|tower|tour)\b/i.test(texteNorm);
    return {
      familleNom: FAMILLES.SERVEURS,
      categorieNom: isTour ? "SERVEURS TOUR" : "SERVEURS RACK",
      cheminComplet: chemin(FAMILLES.SERVEURS, isTour ? "SERVEURS TOUR" : "SERVEURS RACK"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: `Détecté comme serveur informatique (${isTour ? "Tour" : "Rack"})`,
      attributsExtraits: attributs,
    };
  }

  // --- F. CARTES GRAPHIQUES (GPU) ---
  if (
    texteNorm.includes("carte graphique") ||
    texteNorm.includes("gpu") ||
    /\b(geforce|rtx\s*[0-9]{3,4}|gtx\s*[0-9]{3,4}|quadro\s*[a-z0-9]+|radeon\s*rx\s*[0-9]{3,4})\b/i.test(texteNorm)
  ) {
    return {
      familleNom: FAMILLES.COMPOSANTS,
      categorieNom: "CARTES GRAPHIQUES",
      cheminComplet: chemin(FAMILLES.COMPOSANTS, "CARTES GRAPHIQUES"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme carte graphique GPU",
      attributsExtraits: attributs,
    };
  }

  // --- G. ÉCRANS & MONITEURS ---
  if (
    texteNorm.includes("ecran") ||
    texteNorm.includes("moniteur") ||
    texteNorm.includes("display") ||
    (/\b(22\"|24\"|27\"|32\"|34\"|fhd|qhd|4k)\b/i.test(texteNorm) && (texteNorm.includes("ips") || texteNorm.includes("hz") || texteNorm.includes("led") || texteNorm.includes("dalle")))
  ) {
    return {
      familleNom: FAMILLES.PERIPHERIQUES,
      categorieNom: "ÉCRANS",
      cheminComplet: chemin(FAMILLES.PERIPHERIQUES, "ÉCRANS"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme moniteur / écran d'affichage",
      attributsExtraits: attributs,
    };
  }

  // --- H. CONSOMMABLES ---
  if (
    texteNorm.includes("toner") ||
    texteNorm.includes("cartouche") ||
    texteNorm.includes("tambour") ||
    texteNorm.includes("drum") ||
    texteNorm.includes("ruban") ||
    /\b(q2612a|cb435a|ce285a|cf217a|cf283a|tn-?[0-9]{3,4})\b/i.test(texteNorm)
  ) {
    return {
      familleNom: FAMILLES.IMPRESSION,
      categorieNom: "CONSOMMABLES",
      cheminComplet: chemin(FAMILLES.IMPRESSION, "CONSOMMABLES"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme cartouche ou toner d'impression",
      attributsExtraits: attributs,
    };
  }

  // --- I. IMPRIMANTES ---
  if (
    texteNorm.includes("imprimante") ||
    texteNorm.includes("laserjet") ||
    texteNorm.includes("deskjet") ||
    texteNorm.includes("ecotank") ||
    texteNorm.includes("pixma")
  ) {
    return {
      familleNom: FAMILLES.IMPRESSION,
      categorieNom: "IMPRIMANTES",
      cheminComplet: chemin(FAMILLES.IMPRESSION, "IMPRIMANTES"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme imprimante bureautique",
      attributsExtraits: attributs,
    };
  }

  // --- J. RÉSEAU ---
  if (
    texteNorm.includes("switch") ||
    texteNorm.includes("routeur") ||
    texteNorm.includes("point d'acces") ||
    texteNorm.includes("firewall") ||
    texteNorm.includes("mikrotik") ||
    texteNorm.includes("cisco") ||
    texteNorm.includes("ubiquiti") ||
    texteNorm.includes("sfp") ||
    texteNorm.includes("poe") ||
    texteNorm.includes("rj45")
  ) {
    return {
      familleNom: FAMILLES.RESEAU,
      categorieNom: "SWITCHES",
      cheminComplet: chemin(FAMILLES.RESEAU, "SWITCHES"),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme équipement réseau (Switch/Routeur)",
      attributsExtraits: attributs,
    };
  }

  // --- K. ORDINATEURS PORTABLES ---
  if (
    texteNorm.includes("portable") ||
    texteNorm.includes("laptop") ||
    texteNorm.includes("notebook") ||
    texteNorm.includes("ultrabook") ||
    texteNorm.includes("macbook") ||
    texteNorm.includes("thinkpad") ||
    texteNorm.includes("elitebook") ||
    texteNorm.includes("probook") ||
    texteNorm.includes("latitude") ||
    texteNorm.includes("xps") ||
    texteNorm.includes("zenbook") ||
    texteNorm.includes("vivobook") ||
    texteNorm.includes("swift") ||
    texteNorm.includes("aspire") ||
    texteNorm.includes("ideapad") ||
    texteNorm.includes("yoga") ||
    (/\b(13\.3\"|14\"|15\.6\"|16\"|17\.3\"|12\.5\"|13\"|15\")\b/i.test(texteNorm) && (texteNorm.includes("i5") || texteNorm.includes("i7") || texteNorm.includes("i3") || texteNorm.includes("ryzen")))
  ) {
    const sousCat = texteNorm.includes("macbook") ? "MacBook & Ultrabooks" : "PC Portables Professionnels";
    return {
      familleNom: FAMILLES.INFORMATIQUE,
      categorieNom: "PC PORTABLES",
      sousCategorieNom: sousCat,
      cheminComplet: chemin(FAMILLES.INFORMATIQUE, "PC PORTABLES", sousCat),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme ordinateur portable",
      attributsExtraits: attributs,
    };
  }

  // --- L. ORDINATEURS FIXES & STATIONS ---
  if (
    texteNorm.includes("optiplex") ||
    texteNorm.includes("thinkcentre") ||
    texteNorm.includes("prodesk") ||
    texteNorm.includes("elitedesk") ||
    texteNorm.includes("precision") ||
    texteNorm.includes("workstation") ||
    texteNorm.includes("mini pc") ||
    texteNorm.includes("tiny") ||
    texteNorm.includes("sff") ||
    texteNorm.includes("usff") ||
    texteNorm.includes("tour") ||
    texteNorm.includes("desktop") ||
    texteNorm.includes("tout-en-un") ||
    texteNorm.includes("aio") ||
    (/\b(i3|i5|i7|i9|ryzen)\b/i.test(texteNorm) && (texteNorm.includes("pc") || texteNorm.includes("unite centrale")))
  ) {
    let sousCat = "PC Fixes (SFF / Tour)";
    let categorieCible = "PC DE BUREAU";
    if (texteNorm.includes("tiny") || texteNorm.includes("mini pc") || texteNorm.includes("micro") || texteNorm.includes("usff")) {
      categorieCible = "MINI PC";
      sousCat = "Mini PC & Tiny";
    } else if (texteNorm.includes("tout-en-un") || texteNorm.includes("aio")) {
      categorieCible = "ALL-IN-ONE";
      sousCat = "Tout-en-un (AIO)";
    } else if (texteNorm.includes("workstation") || texteNorm.includes("precision") || texteNorm.includes("z440") || texteNorm.includes("z640")) {
      categorieCible = "STATIONS DE TRAVAIL";
      sousCat = "Stations de Travail (Workstations)";
    }

    return {
      familleNom: FAMILLES.INFORMATIQUE,
      categorieNom: categorieCible,
      sousCategorieNom: sousCat,
      cheminComplet: chemin(FAMILLES.INFORMATIQUE, categorieCible, sousCat),
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme ordinateur fixe ou station de travail",
      attributsExtraits: attributs,
    };
  }

  // --- M. HEURISTIQUE PAR DÉFAUT ---
  // Utiliser le moteur canonique comme filet de sécurité
  const noeudCanonique = devinerCategorie(texte);
  if (noeudCanonique) {
    return {
      familleNom: noeudCanonique.famille,
      categorieNom: noeudCanonique.categorie,
      sousCategorieNom: noeudCanonique.sousCategorie,
      cheminComplet: chemin(noeudCanonique.famille, noeudCanonique.categorie, noeudCanonique.sousCategorie),
      marque: marqueExtraite,
      scoreConfiance: "moyen",
      doute: true,
      explication: "Classifié par heuristic canonique (confiance moyenne)",
      attributsExtraits: attributs,
    };
  }

  // Non classé
  return {
    familleNom: FAMILLES.PERIPHERIQUES,
    categorieNom: "CLAVIERS & SOURIS",
    cheminComplet: chemin(FAMILLES.PERIPHERIQUES, "CLAVIERS & SOURIS"),
    marque: marqueExtraite,
    scoreConfiance: "faible",
    doute: true,
    explication: "Mots-clés insuffisants pour une classification certaine",
    attributsExtraits: attributs,
  };
}
