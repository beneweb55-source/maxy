/**
 * MOTEUR INTELLIGENT DE CLASSIFICATION AUTOMATIQUE POUR L'IMPORTATION
 * Analyse les désignations brutes des fournisseurs (CSV / Excel) et déduit :
 * - Famille cible
 * - Catégorie cible
 * - Sous-catégorie cible
 * - Marque extraite
 * - Attributs techniques normalisés
 * - Score de confiance ("haut" | "moyen" | "faible") et flag de doute
 */

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

export function autoClassifyProduct(designationBrute: string): ClassificationImportResult {
  if (!designationBrute || typeof designationBrute !== "string" || !designationBrute.trim()) {
    return {
      familleNom: "ORDINATEURS",
      categorieNom: "PC Portables",
      cheminComplet: "ORDINATEURS › PC Portables",
      scoreConfiance: "faible",
      doute: true,
      explication: "Désignation vide ou non renseignée",
      attributsExtraits: {},
    };
  }

  const texte = designationBrute.trim();
  const texteNorm = texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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

  // Extraction RAM (ex: 8Go, 16Go, 32GB, 64 Go)
  const matchRam = texte.match(/(\b[0-9]{1,3})\s*(go|gb|g)\s*(ram|ddr[345]|sodimm|udimm)?/i);
  if (matchRam && Number(matchRam[1]) >= 2 && Number(matchRam[1]) <= 512) {
    attributs.ram_taille = `${matchRam[1]} Go`;
  }

  // Extraction Stockage (ex: 256Go SSD, 512GB NVMe, 1To HDD)
  const matchStockage = texte.match(/(\b[0-9]{1,4})\s*(go|gb|to|tb)\s*(ssd|hdd|nvme|m\.2|sata)?/i);
  if (matchStockage && matchStockage[1] && matchStockage[2]) {
    const unite = matchStockage[2].toLowerCase().startsWith("t") ? "To" : "Go";
    attributs.capacite_stockage = `${matchStockage[1]} ${unite}`;
  }

  // Extraction Processeur (ex: i5-8350U, i7 10700, Ryzen 5 5600H, Xeon E5-2680)
  const matchCpu = texte.match(/\b(i[3579][ -]?[0-9]{4,5}[a-z0-9]*|ryzen\s*[3579]\s*[0-9]{4}[a-z]*|xeon\s*[a-z0-9 -]+|m[1234]\s*(pro|max|ultra)?)\b/i);
  if (matchCpu) {
    attributs.cpu = matchCpu[0].toUpperCase();
  }

  // =========================================================================
  // 2. RÈGLES DE CLASSIFICATION PAR ORDRE DE PRIORITÉ MÉTIER DÉCROISSANT
  // =========================================================================

  // --- A. ALIMENTATION & CHARGEURS ---
  if (
    texteNorm.includes("chargeur") || 
    texteNorm.includes("adaptateur secteur") || 
    texteNorm.includes("bloc d'alimentation externe") ||
    /\b(45w|65w|90w|135w|170w|230w)\b/i.test(texteNorm) && (texteNorm.includes("alim") || texteNorm.includes("embout") || texteNorm.includes("power adapter"))
  ) {
    const matchWatts = texte.match(/\b([0-9]{2,3})\s*w\b/i);
    if (matchWatts) attributs.puissance_w = `${matchWatts[1]}W`;
    return {
      familleNom: "ALIMENTATION & CHARGEURS",
      categorieNom: "Chargeurs & Adaptateurs",
      sousCategorieNom: "Chargeurs PC Portables",
      cheminComplet: "ALIMENTATION & CHARGEURS › Chargeurs & Adaptateurs › Chargeurs PC Portables",
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
    return {
      familleNom: "MÉMOIRE & PROCESSEURS",
      categorieNom: "Mémoire Vive (RAM)",
      sousCategorieNom: isSodimm ? "RAM PC Portable (SO-DIMM)" : "RAM PC Fixe (DIMM)",
      cheminComplet: `MÉMOIRE & PROCESSEURS › Mémoire Vive (RAM) › ${isSodimm ? "RAM PC Portable (SO-DIMM)" : "RAM PC Fixe (DIMM)"}`,
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

    let sousCat = isSsd ? (isM2 ? "SSD M.2 (NVMe / SATA)" : "SSD 2.5\" SATA") : (isSas ? "Disques SAS Serveur" : "Disques SATA 3.5\" & 2.5\"");

    return {
      familleNom: "STOCKAGE",
      categorieNom: isSsd ? "Disques Flash (SSD)" : "Disques Durs (HDD)",
      sousCategorieNom: sousCat,
      cheminComplet: `STOCKAGE › ${isSsd ? "Disques Flash (SSD)" : "Disques Durs (HDD)"} › ${sousCat}`,
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: `Détecté comme support de stockage (${isSsd ? "SSD" : "HDD"})`,
      attributsExtraits: attributs,
    };
  }

  // --- D. POINT DE VENTE & CAISSE (POS) ---
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
    let sousCat = "Terminaux Tactiles POS";
    if (texteNorm.includes("tiroir")) sousCat = "Tiroirs-Caisses";
    else if (texteNorm.includes("douchette") || texteNorm.includes("scanner") || texteNorm.includes("code")) sousCat = "Lecteurs Code-Barres";
    else if (texteNorm.includes("ticket") || texteNorm.includes("thermique")) sousCat = "Imprimantes Tickets & Reçus";

    return {
      familleNom: "ORDINATEURS",
      categorieNom: "Matériel Point de Vente (POS)",
      sousCategorieNom: sousCat,
      cheminComplet: `ORDINATEURS › Matériel Point de Vente (POS) › ${sousCat}`,
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme équipement de Point de Vente / Encaissement",
      attributsExtraits: attributs,
    };
  }

  // --- E. SERVEURS & BAIES ---
  if (
    texteNorm.includes("serveur") || 
    texteNorm.includes("proliant") || 
    texteNorm.includes("poweredge") || 
    texteNorm.includes("thinksystem") || 
    texteNorm.includes("primergy") || 
    /\b(dl380|dl360|dl20|dl160|dl180|r730|r740|r630|r640|r720|r710|r530|r430|r330|r230)\b/i.test(texteNorm) ||
    /\b(ml350|ml110|ml10|ml30|t430|t440|t330|t340|t130|t140|st50)\b/i.test(texteNorm) ||
    /\b(1u|2u|4u)\b/i.test(texteNorm) && (texteNorm.includes("rack") || texteNorm.includes("chassis"))
  ) {
    const isTour = /\b(ml350|ml110|ml10|ml30|t430|t440|t330|t340|t130|t140|st50|tower|tour)\b/i.test(texteNorm);
    return {
      familleNom: "SERVEURS & BAIES",
      categorieNom: "Serveurs",
      sousCategorieNom: isTour ? "Serveurs Tour" : "Serveurs Rack (1U / 2U / 4U)",
      cheminComplet: `SERVEURS & BAIES › Serveurs › ${isTour ? "Serveurs Tour" : "Serveurs Rack (1U / 2U / 4U)"}`,
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
      familleNom: "COMPOSANTS & CARTES",
      categorieNom: "Cartes Graphiques (GPU)",
      sousCategorieNom: texteNorm.includes("quadro") ? "GPU Professionnels & Stations" : "GPU Gaming & Dédiés",
      cheminComplet: "COMPOSANTS & CARTES › Cartes Graphiques (GPU)",
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
      familleNom: "AFFICHAGE & MULTIMÉDIA",
      categorieNom: "Écrans & Moniteurs",
      cheminComplet: "AFFICHAGE & MULTIMÉDIA › Écrans & Moniteurs",
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme moniteur / écran d'affichage",
      attributsExtraits: attributs,
    };
  }

  // --- H. IMPRIMANTES & CONSOMMABLES ---
  if (
    texteNorm.includes("toner") || 
    texteNorm.includes("cartouche") || 
    texteNorm.includes("tambour") || 
    texteNorm.includes("drum") || 
    texteNorm.includes("ruban") ||
    /\b(q2612a|cb435a|ce285a|cf217a|cf283a|tn-?[0-9]{3,4})\b/i.test(texteNorm)
  ) {
    return {
      familleNom: "CONSOMMABLES & IMPRESSION",
      categorieNom: "Consommables (Toners, Encres)",
      cheminComplet: "CONSOMMABLES & IMPRESSION › Consommables (Toners, Encres)",
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme cartouche ou toner d'impression",
      attributsExtraits: attributs,
    };
  }

  if (
    texteNorm.includes("imprimante") || 
    texteNorm.includes("laserjet") || 
    texteNorm.includes("deskjet") || 
    texteNorm.includes("ecotank") || 
    texteNorm.includes("pixma")
  ) {
    return {
      familleNom: "CONSOMMABLES & IMPRESSION",
      categorieNom: "Imprimantes & Scanners",
      cheminComplet: "CONSOMMABLES & IMPRESSION › Imprimantes & Scanners",
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme imprimante bureautique",
      attributsExtraits: attributs,
    };
  }

  // --- I. RÉSEAU & CONNECTIVITÉ ---
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
      familleNom: "RÉSEAU & CONNECTIVITÉ",
      categorieNom: "Équipements Réseau",
      cheminComplet: "RÉSEAU & CONNECTIVITÉ › Équipements Réseau",
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme équipement réseau (Switch/Routeur)",
      attributsExtraits: attributs,
    };
  }

  // --- J. ORDINATEURS PORTABLES (LAPTOPS) ---
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
    return {
      familleNom: "ORDINATEURS",
      categorieNom: "PC Portables",
      sousCategorieNom: texteNorm.includes("macbook") ? "MacBook & Ultrabooks" : "PC Portables Professionnels",
      cheminComplet: `ORDINATEURS › PC Portables › ${texteNorm.includes("macbook") ? "MacBook & Ultrabooks" : "PC Portables Professionnels"}`,
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme ordinateur portable",
      attributsExtraits: attributs,
    };
  }

  // --- K. ORDINATEURS FIXES & STATIONS (DESKTOPS) ---
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
    if (texteNorm.includes("tiny") || texteNorm.includes("mini pc") || texteNorm.includes("micro") || texteNorm.includes("usff")) {
      sousCat = "Mini PC & Tiny";
    } else if (texteNorm.includes("tout-en-un") || texteNorm.includes("aio")) {
      sousCat = "Tout-en-un (AIO)";
    } else if (texteNorm.includes("workstation") || texteNorm.includes("precision") || texteNorm.includes("z440") || texteNorm.includes("z640")) {
      sousCat = "Stations de Travail (Workstations)";
    }

    return {
      familleNom: "ORDINATEURS",
      categorieNom: "PC Fixes & Stations",
      sousCategorieNom: sousCat,
      cheminComplet: `ORDINATEURS › PC Fixes & Stations › ${sousCat}`,
      marque: marqueExtraite,
      scoreConfiance: "haut",
      doute: false,
      explication: "Détecté comme ordinateur fixe ou station de travail",
      attributsExtraits: attributs,
    };
  }

  // --- L. CAS HEURISTIQUE PAR DÉFAUT (CONFIANCE MOYENNE OU FAIBLE) ---
  // Si contient CPU ou RAM sans format précis -> Doute PC
  if (attributs.cpu || attributs.ram_taille) {
    return {
      familleNom: "ORDINATEURS",
      categorieNom: "PC Portables",
      cheminComplet: "ORDINATEURS › PC Portables (À confirmer)",
      marque: marqueExtraite,
      scoreConfiance: "moyen",
      doute: true,
      explication: "Processeur ou RAM détecté mais format (Portable vs Fixe) indéterminé",
      attributsExtraits: attributs,
    };
  }

  // Si non classé avec certitude
  return {
    familleNom: "ACCESSOIRES & CONNECTIQUE",
    categorieNom: "Divers & Accessoires",
    cheminComplet: "ACCESSOIRES & CONNECTIQUE › Divers & Accessoires",
    marque: marqueExtraite,
    scoreConfiance: "faible",
    doute: true,
    explication: "Mots-clés insuffisants pour une classification certaine",
    attributsExtraits: attributs,
  };
}
