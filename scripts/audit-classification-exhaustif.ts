/**
 * AUDIT EXHAUSTIF DE CLASSIFICATION — 100% des produits
 *
 * Ce script est SÛR : il ne supprime, ne modifie, ne réinitialise RIEN.
 * Il lit la base de données, compare chaque produit à la classification attendue,
 * et génère un rapport JSON + Markdown avec toutes les incohérences.
 *
 * Usage : npx tsx scripts/audit-classification-exhaustif.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// MOTS-CLÉS MULTI-SIGNAUX — chaque produit est évalué sur TOUS ces signaux
// ============================================================================

interface SignalDetected {
  signal: string;
  confidence: number;  // 0-100
  targetFamille: string;
  targetCategorie: string;
  targetSousCategorie: string;
  reason: string;
}

// ---- Laptops ----
function detectLaptop(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  const laptopPatterns = [
    /\b(portable|laptop|notebook|ultrabook)\b/,
    /\b(thinkpad|elitebook|probook|latitude|vostro\s*laptop)\b/,
    /\b(macbook|macbook\s*(air|pro))\b/,
    /\b(zenbook|vivobook|aspire|swift|nitro)\b/,
    /\b(inspiron\s*(13|14|15|16)|pavilion\s*\d+)\b/,
    /\b(ideapad|yoga\s*\d+|legion)\b/,
    /\b(xps\s*(13|15|17)|xps\s*\d{4})\b/,
    /\b(expertbook|chromebook)\b/,
    /\b(surface\s*(laptop|pro\s*\d+))\b/,
    // Screen size patterns that strongly suggest laptop
    /\b(1[2-7]\.3"|1[2-7]\.5"|14"|15\.6"|16"|17\.3")\b/,
  ];

  // Negative signals — these suggest it's NOT a laptop
  const antiLaptop = [
    /\b(sodimm|udimm|rdimm|barrette\s*ram)\b/,  // RAM modules
    /\b(ssd|nvme|hdd|disque\s*dur)\b/,             // Storage drives
    /\b(chargeur|adaptateur|alimentation)\b/,       // Chargers
    /\b(born(e|ette)|kiosk|pos|caisse)\b/,          // POS terminals
  ];

  if (antiLaptop.some(p => p.test(combined))) return null;

  for (const pattern of laptopPatterns) {
    if (pattern.test(combined)) {
      return {
        signal: "laptop_pattern",
        confidence: 93,
        targetFamille: "ORDINATEURS",
        targetCategorie: "PC Portables",
        targetSousCategorie: "Laptops & Ultrabooks",
        reason: `Pattern laptop détecté: ${pattern.source.substring(0, 40)}`,
      };
    }
  }
  return null;
}

// ---- Desktops ----
function detectDesktop(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  const desktopPatterns = [
    /\b(optiplex|thinkcentre|prodesk|elitedesk)\b/,
    /\b(veriton|aspire\s*(z|xc))\b/,
    /\b(desktop|tour|sff|usff|micro\s*tower)\b/,
    /\b(vostro\s*desktop|vostro\s*\d{4})\b/,
    /\b(precision\s*(tower|workstation|3\d{3}|5\d{3}|7\d{3}))\b/,
    /\b(thinkstation)\b/,
    /\b(mini\s*pc|tiny|micro\s*pc|nuc|beelink|minisforum)\b/,
    /\b(all[\s-]*in[\s-]*one|aio|tout[\s-]*en[\s-]*un|imac)\b/,
    /\b(z240|z440|z640|z840)\b/,
  ];

  const antiDesktop = [
    /\b(sodimm|udimm|rdimm|barrette\s*ram)\b/,
    /\b(ssd|nvme|hdd|disque\s*dur)\b/,
    /\b(chargeur|adaptateur)\b/,
  ];

  if (antiDesktop.some(p => p.test(combined))) return null;

  for (const pattern of desktopPatterns) {
    if (pattern.test(combined)) {
      const isMiniPc = /\b(mini\s*pc|tiny|micro\s*pc|nuc|beelink|minisforum)\b/.test(combined);
      const isAio = /\b(all[\s-]*in[\s-]*one|aio|tout[\s-]*en[\s-]*un|imac)\b/.test(combined);
      const isWorkstation = /\b(precision\s*(tower|workstation|3\d{3}|5\d{3}|7\d{3})|thinkstation|z440|z640|z840)\b/.test(combined);

      let sub = "Tours & Formats SFF";
      if (isMiniPc) sub = "Mini PC & Clients Légers";
      else if (isAio) sub = "Tout-en-un (All-in-One)";
      else if (isWorkstation) sub = "Stations de Travail & PC Gaming";

      return {
        signal: "desktop_pattern",
        confidence: 91,
        targetFamille: "ORDINATEURS",
        targetCategorie: "PC Fixes & Tout-en-un",
        targetSousCategorie: sub,
        reason: `Pattern desktop détecté: ${pattern.source.substring(0, 40)}`,
      };
    }
  }
  return null;
}

// ---- Servers ----
function detectServer(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  const rackPatterns = [
    /\b(proliant\s*dl|dl380|dl360|dl20|dl160|dl180)\b/,
    /\b(poweredge\s*r|r730|r740|r630|r640|r720|r710|r530|r430)\b/,
    /\b(thinksystem\s*sr|primergy)\b/,
    /\b(1u|2u|4u)\b.*\b(rack|chassis)\b/,
    /\b(rack\s*server|serveur\s*rack)\b/,
  ];

  const towerPatterns = [
    /\b(proliant\s*ml|ml350|ml110|ml10|ml30)\b/,
    /\b(t430|t440|t330|t340|t130|t140|st50)\b/,
    /\b(serveur\s*tour|tower\s*server)\b/,
  ];

  for (const pattern of rackPatterns) {
    if (pattern.test(combined)) {
      return {
        signal: "server_rack_pattern",
        confidence: 94,
        targetFamille: "SERVEURS & INFRASTRUCTURE",
        targetCategorie: "Serveurs",
        targetSousCategorie: "Serveurs Rack (1U / 2U / 4U)",
        reason: `Pattern serveur rack: ${pattern.source.substring(0, 40)}`,
      };
    }
  }

  for (const pattern of towerPatterns) {
    if (pattern.test(combined)) {
      return {
        signal: "server_tower_pattern",
        confidence: 94,
        targetFamille: "SERVEURS & INFRASTRUCTURE",
        targetCategorie: "Serveurs",
        targetSousCategorie: "Serveurs Tour",
        reason: `Pattern serveur tour: ${pattern.source.substring(0, 40)}`,
      };
    }
  }

  return null;
}

// ---- Xeon / EPYC CPUs ----
function detectCpu(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  // Server CPUs
  if (/\b(xeon|epyc)\b/i.test(combined) && !/\b(portable|laptop|notebook|thinkpad|probook|elitebook)\b/.test(combined)) {
    return {
      signal: "server_cpu_pattern",
      confidence: 95,
      targetFamille: "MÉMOIRE & PROCESSEURS",
      targetCategorie: "Processeurs (CPU)",
      targetSousCategorie: "Processeurs Serveur (Intel Xeon / AMD EPYC)",
      reason: "Processeur serveur Xeon/EPYC détecté",
    };
  }

  // Desktop CPUs
  if (/\b(core\s*i[3579]|intel\s*core|ryzen\s*[3579]|threadripper|pentium|celeron)\b/i.test(combined)) {
    // Check it's not inside a full product name like "OptiPlex 7090 Core i5"
    if (/\b(optiplex|thinkcentre|prodesk|elitedesk|desktop|tower|sff)\b/.test(combined)) return null;
    return {
      signal: "desktop_cpu_pattern",
      confidence: 88,
      targetFamille: "MÉMOIRE & PROCESSEURS",
      targetCategorie: "Processeurs (CPU)",
      targetSousCategorie: "Processeurs PC (Intel Core / AMD Ryzen)",
      reason: "Processeur PC détecté",
    };
  }

  return null;
}

// ---- RAM ----
function detectRam(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  // Must NOT be a full product
  const antiRam = [
    /\b(portable|laptop|notebook|thinkpad|probook|elitebook|latitude|optiplex|thinkcentre|serveur|proliant|poweredge)\b/,
    /\b(desktop|tower|sff|workstation|precision)\b/,
    /\b(macbook|imac|zenbook|vivobook|aspire)\b/,
  ];

  if (antiRam.some(p => p.test(combined))) return null;

  const ramSignals = [
    /\b(sodimm|udimm|rdimm|lrdimm)\b/,
    /\b(barrette\s*(de\s*)?ram|ram\s*(barrette|module))\b/,
    /\b(ddr[345]\s*(sodimm|udimm|rdimm))\b/,
    /\b(ddr[345]\s*\d+\s*(go|gb))\b/,
    /\b(\d+\s*(go|gb)\s*ddr[345])\b/,
    /\b(\d+\s*(go|gb)\s*ram)\b/,
    /\b(ram\s*\d+\s*(go|gb))\b/,
  ];

  for (const pattern of ramSignals) {
    if (pattern.test(combined)) {
      const isSodimm = /\b(sodimm|laptop|portable|mini\s*pc)\b/.test(combined);
      const isRdimm = /\b(rdimm|lrdimm|ecc\s*(reg|registered)|serveur|server)\b/.test(combined);
      let sub = "RAM PC Fixe (UDIMM / Non-ECC)";
      if (isSodimm) sub = "RAM PC Portable (SO-DIMM)";
      else if (isRdimm) sub = "RAM Serveur (ECC Registered / RDIMM)";

      return {
        signal: "ram_pattern",
        confidence: 93,
        targetFamille: "MÉMOIRE & PROCESSEURS",
        targetCategorie: "Mémoire Vive (RAM)",
        targetSousCategorie: sub,
        reason: `Pattern RAM: ${pattern.source.substring(0, 40)}`,
      };
    }
  }
  return null;
}

// ---- SSD / HDD / Storage ----
function detectStorage(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  const antiStorage = [
    /\b(portable|laptop|notebook|thinkpad|probook|elitebook|latitude|optiplex|thinkcentre|serveur|proliant|poweredge)\b/,
    /\b(desktop|tower|sff|workstation|precision|macbook|imac)\b/,
    /\b(pos|caisse|imprimante|scanner)\b/,
  ];

  if (antiStorage.some(p => p.test(combined))) return null;

  // SSD
  if (/\b(ssd|nvme|m\.2|nand|flash\s*storage)\b/i.test(combined)) {
    const isM2 = /\b(nvme|m\.2|pcie\s*gen)\b/i.test(combined);
    return {
      signal: "ssd_pattern",
      confidence: 91,
      targetFamille: "STOCKAGE",
      targetCategorie: "Disques Flash (SSD)",
      targetSousCategorie: isM2 ? "Disques SSD M.2 NVMe & PCIe" : "Disques SSD 2,5\" SATA",
      reason: `SSD détecté ${isM2 ? "(M.2/NVMe)" : "(SATA)"}`,
    };
  }

  // HDD
  if (/\b(hdd|disque\s*dur|barracuda|ironwolf)\b/i.test(combined) ||
      (/\b(seagate|western\s*digital|wd\s*(blue|black|red|green))\b/i.test(combined) &&
       /\b(\d+\s*(to|tb|go|gb))\b/i.test(combined) &&
       !/\b(ssd|nvme)\b/i.test(combined))) {
    const isSas = /\b(sas)\b/i.test(combined);
    return {
      signal: "hdd_pattern",
        confidence: 88,
      targetFamille: "STOCKAGE",
      targetCategorie: "Disques Durs Mécaniques (HDD)",
      targetSousCategorie: isSas ? "Disques Durs SAS 2,5\" (10K / 15K RPM)" : "Disques Durs SATA 3,5\" (Bureautique / NAS)",
      reason: `HDD détecté ${isSas ? "(SAS)" : "(SATA)"}`,
    };
  }

  return null;
}

// ---- GPU ----
function detectGpu(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  const antiGpu = [
    /\b(portable|laptop|notebook|thinkpad|probook|macbook)\b/,
    /\b(desktop|tower|optiplex|thinkcentre)\b/,
    /\b(sodimm|ram|ssd|hdd)\b/,
  ];

  if (antiGpu.some(p => p.test(combined))) return null;

  if (/\b(geforce|rtx\s*\d{3,4}|gtx\s*\d{3,4}|radeon\s*rx|intel\s*arc|gpu|quadro)\b/i.test(combined)) {
    const isPro = /\b(quadro|rtx\s*a\d{3,4}|rtx\s*pro)\b/i.test(combined);
    return {
      signal: "gpu_pattern",
      confidence: 90,
      targetFamille: "COMPOSANTS & CARTES D'EXTENSION",
      targetCategorie: "Cartes Graphiques (GPU)",
      targetSousCategorie: isPro ? "Cartes Graphiques Professionnelles (Quadro / RTX Pro)" : "Cartes Graphiques Grand Public (GeForce / Radeon)",
      reason: `GPU ${isPro ? "professionnel" : "grand public"} détecté`,
    };
  }
  return null;
}

// ---- Monitors ----
function detectMonitor(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  if (/\b(moniteur|ecran|monitor|display)\b/i.test(combined) &&
      !/\b(portable|laptop|notebook)\b/.test(combined)) {
    return {
      signal: "monitor_pattern",
      confidence: 85,
      targetFamille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      targetCategorie: "Moniteurs & Affichage",
      targetSousCategorie: "Écrans & Moniteurs Bureautique / Pro",
      reason: "Moniteur/écran détecté",
    };
  }
  return null;
}

// ---- Printers ----
function detectPrinter(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  if (/\b(imprimante|laserjet|deskjet|ecotank|pixma|brother\s*(dcp|hl|mfc)|zebra|ticket\s*caisse)\b/i.test(combined)) {
    return {
      signal: "printer_pattern",
      confidence: 90,
      targetFamille: "IMPRESSION & CONSOMMABLES",
      targetCategorie: "Imprimantes & Scanners",
      targetSousCategorie: "Imprimantes Laser & Multifonctions",
      reason: "Imprimante détectée",
    };
  }

  // Consumables (toners, cartridges)
  if (/\b(toner|cartouche|tambour|drum|ruban)\b/i.test(combined) ||
      /\b(q2612a|cb435a|ce285a|cf217a|cf283a|tn-?[0-9]{3,4})\b/i.test(combined)) {
    return {
      signal: "consumable_pattern",
      confidence: 90,
      targetFamille: "IMPRESSION & CONSOMMABLES",
      targetCategorie: "Consommables d'Impression",
      targetSousCategorie: "Toners & Tambours Laser",
      reason: "Consommable impression détecté",
    };
  }
  return null;
}

// ---- Network ----
function detectNetwork(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  if (/\b(switch|routeur|firewall|point\s*d'acc(è|e)s|access\s*point|ubiquiti|unifi|cisco|mikrotik|tp-link|d-link|netgear|fortinet|sfp|rj45|poe)\b/i.test(combined)) {
    return {
      signal: "network_pattern",
      confidence: 85,
      targetFamille: "RÉSEAU ACTIF & COMMUTATION",
      targetCategorie: "Commutateurs & Routage",
      targetSousCategorie: "Switches Réseau (Manageables / PoE)",
      reason: "Équipement réseau détecté",
    };
  }
  return null;
}

// ---- POS / Cash registers ----
function detectPos(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  if (/\b(pos|caisse|tiroir[\s-]*caisse|douchette|lecteur\s*code[\s-]*barre|terminal\s*tactile|afficheur\s*client|aures|tm-t20|tm-t88|bixolon|xprinter|sunmi)\b/i.test(combined)) {
    return {
      signal: "pos_pattern",
      confidence: 88,
      targetFamille: "ORDINATEURS",
      targetCategorie: "Matériel Point de Vente (POS)",
      targetSousCategorie: "Terminaux & Caisses Tactiles (TPV)",
      reason: "Équipement POS détecté",
    };
  }
  return null;
}

// ---- Chargers ----
function detectCharger(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  if (/\b(chargeur|adaptateur\s*secteur|bloc\s*d'alimentation\s*externe|power\s*adapter)\b/i.test(combined) ||
      (/\b(45w|65w|90w|135w|170w|230w)\b/i.test(combined) && /\b(alim|embout|adapter|power)\b/i.test(combined))) {
    return {
      signal: "charger_pattern",
      confidence: 92,
      targetFamille: "ÉLECTRICITÉ & ALIMENTATION",
      targetCategorie: "Chargeurs & Alimentation Externe",
      targetSousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)",
      reason: "Chargeur/alimentation détecté",
    };
  }
  return null;
}

// ---- Accessories / Peripherals ----
function detectPeripherals(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  if (/\b(clavier|souris|casque|webcam|tapis\s*souris|station\s*d'accueil|docking\s*station|hub\s*usb)\b/i.test(combined)) {
    return {
      signal: "peripheral_pattern",
      confidence: 80,
      targetFamille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      targetCategorie: "Périphériques de Saisie",
      targetSousCategorie: "Claviers, Souris & Combos",
      reason: "Périphérique de saisie détecté",
    };
  }
  return null;
}

// ---- SAS drives (special case — the user specifically mentioned this) ----
function detectSas(ref: string, marque: string, desc: string, cat: string): SignalDetected | null {
  const combined = `${ref} ${marque} ${desc} ${cat}`.toLowerCase();

  if (/\bsas\b/i.test(combined) && /\b(hdd|disque|drive|disque\s*dur)\b/i.test(combined)) {
    return {
      signal: "sas_drive_pattern",
      confidence: 89,
      targetFamille: "STOCKAGE",
      targetCategorie: "Disques Durs Mécaniques (HDD)",
      targetSousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)",
      reason: "Disque SAS détecté — devrait être en STOCKAGE, pas en PDU/fixations",
    };
  }
  return null;
}

// ============================================================================
// Tous les détecteurs
// ============================================================================
const ALL_DETECTORS = [
  detectSas,       // Must be before storage since it's specific
  detectLaptop,
  detectDesktop,
  detectServer,
  detectCpu,
  detectRam,
  detectStorage,
  detectGpu,
  detectMonitor,
  detectPrinter,
  detectNetwork,
  detectPos,
  detectCharger,
  detectPeripherals,
];

// ============================================================================
// MAPPING FAMILLE NOM → Catégorie tree attendue
// ============================================================================
const EXPECTED_FAMILLE_TREE: Record<string, string[]> = {
  "ORDINATEURS": [
    "PC Portables",
    "PC Fixes & Tout-en-un",
    "Matériel Point de Vente (POS)",
  ],
  "SERVEURS & INFRASTRUCTURE": [
    "Serveurs",
  ],
  "STOCKAGE": [
    "Disques Flash (SSD)",
    "Disques Durs Mécaniques (HDD)",
  ],
  "MÉMOIRE & PROCESSEURS": [
    "Mémoire Vive (RAM)",
    "Processeurs (CPU)",
  ],
  "COMPOSANTS & CARTES D'EXTENSION": [
    "Cartes Graphiques (GPU)",
  ],
  "PÉRIPHÉRIQUES & CONNECTIQUE": [
    "Moniteurs & Affichage",
    "Périphériques de Saisie",
  ],
  "ÉLECTRICITÉ & ALIMENTATION": [
    "Chargeurs & Alimentation Externe",
  ],
  "IMPRESSION & CONSOMMABLES": [
    "Imprimantes & Scanners",
    "Consommables d'Impression",
  ],
  "RÉSEAU ACTIF & COMMUTATION": [
    "Commutateurs & Routage",
  ],
};

// ============================================================================
// MAIN AUDIT
// ============================================================================

interface AuditResult {
  produitId: number;
  codeInterne: string;
  reference: string;
  marque: string;
  categorieActuelle: string;
  familleActuelle: string;
  categorieIdActuelle: number | null;
  estCompose: boolean;
  bomRole: string;
  statut: string;

  // Analyse multi-signaux
  signauxDetectes: SignalDetected[];
  meilleurSignal: SignalDetected | null;
  scoreConfiance: number;

  // Verdict
  estCorrect: boolean;
  categorieAttendue: string;
  familleAttendue: string;
  sousCategorieAttendue: string;
  ecart: string;
  severite: "OK" | "INFO" | "WARNING" | "CRITICAL";
  raison: string;
}

async function auditExhaustif() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  AUDIT EXHAUSTIF DE CLASSIFICATION — 100% DES PRODUITS     ║");
  console.log("║  Mode LECTURE SEULE — aucune modification                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // Récupérer TOUS les produits avec leur catégorie et famille
  const produits = await prisma.produit.findMany({
    select: {
      id: true,
      code_interne: true,
      reference: true,
      categorie: true,
      categorie_id: true,
      est_compose: true,
      bom_role: true,
      statut: true,
      modele: {
        select: {
          nom: true,
          attributs: true,
          categorie: {
            select: {
              nom: true,
              parent: {
                select: {
                  nom: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`📦 Produits trouvés : ${produits.length}\n`);

  if (produits.length === 0) {
    console.log("⚠️  Aucun produit en base. La base est peut-être vide.");
    console.log("   Exécutez ce script sur la base de production Vercel/Neon.");
    await prisma.$disconnect();
    return;
  }

  const results: AuditResult[] = [];
  let okCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let infoCount = 0;

  for (const p of produits) {
    // Récupérer la famille depuis le modèle → catégorie → parent
    const familleNom = p.modele?.categorie?.parent?.parent?.nom || "";
    const categorieNom = p.modele?.categorie?.nom || p.categorie || "";
    const marque = (p.modele?.attributs as any)?.marque || "";

    // Détecter les signaux
    const signaux: SignalDetected[] = [];
    for (const detector of ALL_DETECTORS) {
      const signal = detector(p.reference, marque, "", categorieNom);
      if (signal) signaux.push(signal);
    }

    // Meilleur signal = celui avec le score le plus élevé
    const meilleurSignal = signaux.length > 0
      ? signaux.reduce((best, s) => s.confidence > best.confidence ? s : best)
      : null;

    const scoreConfiance = meilleurSignal?.confidence || 0;

    // Déterminer si la classification actuelle est correcte
    let estCorrect = false;
    let categorieAttendue = categorieNom;
    let familleAttendue = familleNom;
    let sousCategorieAttendue = "";
    let ecart = "";
    let severite: "OK" | "INFO" | "WARNING" | "CRITICAL" = "OK";
    let raison = "";

    if (meilleurSignal) {
      categorieAttendue = meilleurSignal.targetCategorie;
      familleAttendue = meilleurSignal.targetFamille;
      sousCategorieAttendue = meilleurSignal.targetSousCategorie;

      // Comparer avec l'état actuel
      const catMatch = categorieNom.toLowerCase().includes(categorieAttendue.toLowerCase()) ||
                       categorieAttendue.toLowerCase().includes(categorieNom.toLowerCase());
      const famMatch = familleNom.toLowerCase().includes(familleAttendue.toLowerCase()) ||
                       familleAttendue.toLowerCase().includes(familleNom.toLowerCase());

      if (catMatch && famMatch) {
        estCorrect = true;
        severite = "OK";
        raison = "Classification correcte";
        okCount++;
      } else if (!catMatch && !famMatch) {
        estCorrect = false;
        severite = "CRITICAL";
        ecart = `Famille: "${familleNom}" → "${familleAttendue}" | Catégorie: "${categorieNom}" → "${categorieAttendue}"`;
        raison = `${meilleurSignal.reason} mais classé en "${familleNom} > ${categorieNom}"`;
        criticalCount++;
      } else if (!catMatch) {
        estCorrect = false;
        severite = "WARNING";
        ecart = `Catégorie: "${categorieNom}" → "${categorieAttendue}"`;
        raison = `${meilleurSignal.reason} mais catégorie incorrecte`;
        warningCount++;
      } else {
        estCorrect = false;
        severite = "INFO";
        ecart = `Famille: "${familleNom}" → "${familleAttendue}"`;
        raison = `${meilleurSignal.reason} mais famille incorrecte`;
        infoCount++;
      }
    } else {
      // Aucun signal détecté
      severite = "INFO";
      raison = "Aucun pattern détecté — vérification manuelle requise";
      infoCount++;
    }

    results.push({
      produitId: p.id,
      codeInterne: p.code_interne,
      reference: p.reference,
      marque,
      categorieActuelle: categorieNom,
      familleActuelle: familleNom,
      categorieIdActuelle: p.categorie_id,
      estCompose: p.est_compose,
      bomRole: p.bom_role,
      statut: p.statut,
      signauxDetectes: signaux,
      meilleurSignal,
      scoreConfiance,
      estCorrect,
      categorieAttendue,
      familleAttendue,
      sousCategorieAttendue,
      ecart,
      severite,
      raison,
    });
  }

  // ============================================================================
  // RAPPORT
  // ============================================================================

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("RÉSUMÉ DE L'AUDIT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`✅ Corrects :     ${okCount} / ${produits.length} (${Math.round(okCount/produits.length*100)}%)`);
  console.log(`⚠️  Warnings :     ${warningCount}`);
  console.log(`🔴 Critiques :    ${criticalCount}`);
  console.log(`ℹ️  À vérifier :   ${infoCount}`);

  // Produits critiques (mauvaise famille + catégorie)
  const critiques = results.filter(r => r.severite === "CRITICAL");
  if (critiques.length > 0) {
    console.log("\n🔴 INCOHÉRENCES CRITIQUES (mauvaise famille + catégorie) :");
    console.log("───────────────────────────────────────────────────────────────");
    for (const c of critiques) {
      console.log(`  [${c.codeInterne}] "${c.reference}"`);
      console.log(`    Actuel : ${c.familleActuelle} > ${c.categorieActuelle}`);
      console.log(`    Attendu: ${c.familleAttendue} > ${c.categorieAttendue} > ${c.sousCategorieAttendue}`);
      console.log(`    Signal : ${c.meilleurSignal?.reason}`);
      console.log(`    Score  : ${c.scoreConfiance}%`);
      console.log("");
    }
  }

  // Produits warnings (mauvaise catégorie seulement)
  const warnings = results.filter(r => r.severite === "WARNING");
  if (warnings.length > 0) {
    console.log("\n⚠️  ALERTES (catégorie incorrecte) :");
    console.log("───────────────────────────────────────────────────────────────");
    for (const w of warnings) {
      console.log(`  [${w.codeInterne}] "${w.reference}"`);
      console.log(`    Actuel : ${w.categorieActuelle}`);
      console.log(`    Attendu: ${w.categorieAttendue} > ${w.sousCategorieAttendue}`);
      console.log("");
    }
  }

  // Produits à vérifier manuellement
  const aVerifier = results.filter(r => r.severite === "INFO" && !r.estCorrect);
  if (aVerifier.length > 0) {
    console.log("\nℹ️  À VÉRIFIER MANUELLEMENT :");
    console.log("───────────────────────────────────────────────────────────────");
    for (const v of aVerifier) {
      console.log(`  [${v.codeInterne}] "${v.reference}" — ${v.raison}`);
    }
  }

  // Statistiques par catégorie
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("RÉPARTITION PAR CATÉGORIE ACTUELLE");
  console.log("═══════════════════════════════════════════════════════════════");
  const parCategorie: Record<string, { total: number; ok: number; ko: number }> = {};
  for (const r of results) {
    const key = `${r.familleActuelle} > ${r.categorieActuelle}`;
    if (!parCategorie[key]) parCategorie[key] = { total: 0, ok: 0, ko: 0 };
    parCategorie[key].total++;
    if (r.estCorrect) parCategorie[key].ok++;
    else parCategorie[key].ko++;
  }
  for (const [cat, stats] of Object.entries(parCategorie).sort((a, b) => b[1].total - a[1].total)) {
    const pct = Math.round(stats.ok / stats.total * 100);
    console.log(`  ${cat} : ${stats.total} produits (${stats.ok} OK, ${stats.ko} KO — ${pct}% correct)`);
  }

  // Sauvegarder le rapport complet en JSON
  const rapport = {
    date: new Date().toISOString(),
    totalProduits: produits.length,
    stats: { ok: okCount, warnings: warningCount, critical: criticalCount, info: infoCount },
    produits: results,
  };

  const fs = await import("fs");
  const rapportPath = "scripts/audit-classification-resultat.json";
  fs.writeFileSync(rapportPath, JSON.stringify(rapport, null, 2));
  console.log(`\n📄 Rapport JSON sauvegardé : ${rapportPath}`);

  // Générer le script SQL de correction (sans l'exécuter)
  const correctionsSql: string[] = [];
  correctionsSql.push("-- ============================================================");
  correctionsSql.push("-- CORRECTIONS DE CLASSIFICATION — Généré par audit-classification-exhaustif.ts");
  correctionsSql.push("-- NE PAS EXÉCUTER AVANT VALIDATION HUMAINE");
  correctionsSql.push("-- ============================================================");
  correctionsSql.push("");

  const correctionsCritiques = results.filter(r => r.severite === "CRITICAL" || r.severite === "WARNING");
  for (const c of correctionsCritiques) {
    correctionsSql.push(`-- [${c.severite}] ${c.codeInterne} — "${c.reference}"`);
    correctionsSql.push(`--   De: ${c.familleActuelle} > ${c.categorieActuelle}`);
    correctionsSql.push(`--   Vers: ${c.familleAttendue} > ${c.categorieAttendue} > ${c.sousCategorieAttendue}`);
    correctionsSql.push(`--   Score: ${c.scoreConfiance}% — ${c.raison}`);
    correctionsSql.push(`-- TODO: Trouver le categorie_id correspondant et UPDATE`);
    correctionsSql.push(`-- UPDATE produits SET categorie_id = <TARGET_ID>, categorie = '${c.categorieAttendue}' WHERE id = ${c.produitId};`);
    correctionsSql.push("");
  }

  const sqlPath = "scripts/corrections-classification.sql";
  fs.writeFileSync(sqlPath, correctionsSql.join("\n"));
  console.log(`📄 Script SQL de correction (draft) : ${sqlPath}`);
  console.log("⚠️  Le script SQL contient des placeholders — à compléter avec les vrais IDs de catégories.");

  await prisma.$disconnect();
  console.log("\n✅ Audit terminé. Aucune donnée n'a été modifiée.");
}

auditExhaustif().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
