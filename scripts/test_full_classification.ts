import * as fs from "fs";
import * as path from "path";

const csvPath = "c:\\Users\\ASUS\\OneDrive\\Desktop\\SOLMAXY\\maxy\\scratch\\snapshot_produits.csv";
const content = fs.readFileSync(csvPath, "utf8");
const lines = content.split(/\r?\n/).filter(Boolean);

export interface ProductRow {
  id: number;
  reference: string;
  categorie: string;
}

export const products: ProductRow[] = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^(\d+),"(.*)","(.*)"$/);
  if (match) {
    products.push({
      id: parseInt(match[1], 10),
      reference: match[2].replace(/""/g, '"'),
      categorie: match[3].replace(/""/g, '"'),
    });
  } else {
    const parts = line.split(",");
    if (parts.length >= 3) {
      products.push({
        id: parseInt(parts[0], 10),
        reference: parts.slice(1, parts.length - 1).join(",").replace(/^"|"$/g, '').replace(/""/g, '"'),
        categorie: parts[parts.length - 1].replace(/^"|"$/g, '').replace(/""/g, '"'),
      });
    }
  }
}

export interface ClassificationResult {
  famille: string;
  categorie: string;
  sousCategorie: string;
  notesExplication?: string;
}

export function classifyProduct(p: ProductRow): ClassificationResult {
  const ref = p.reference.trim();
  const cat = p.categorie.replace(/\u200B/g, '').trim();
  const t = `${ref} ${cat}`.toLowerCase();

  // =========================================================================
  // SPECIFIC EDGE CASES & OVERRIDES FIRST
  // =========================================================================
  // 1. Refroidissement Serveur (Heatsinks / Ventilateurs mentionnant DL360 / ML350 / DL380)
  if (
    cat === "REFROIDISSEMENT SERVEUR" || t.includes("heatsink") || t.includes("dissipateur") ||
    (cat === "COMPOSANTS" && t.includes("ventilation"))
  ) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Refroidissement & Châssis",
      sousCategorie: "Dissipateurs Thermiques & Ventilateurs Serveur",
    };
  }

  // 2. Rails & Accessoires Baie (Kit de rails Lenovo SR530, Cable Arm HP Gen9, PDU, Caddy vide)
  if (
    cat.includes("PDU") || t.includes("pdu") || t.includes("cable arm") ||
    t.includes("kit de rails") || t.includes("cma") || (t.includes("caddy") && t.includes("vide"))
  ) {
    let sous = "Rails, PDU & Gestion des Câbles";
    if (t.includes("caddy") || t.includes("emplacement")) {
      sous = "Caddies, Tiroirs & Câblage Serveur";
    }
    return {
      famille: "SERVEURS & INFRASTRUCTURE",
      categorie: "Accessoires Châssis & Baies",
      sousCategorie: sous,
    };
  }

  // 3. Risers & Cartes d'Extension / Cartes Réseau
  if (t.includes("riser nvme") || t.includes("riser pcie") || cat === "ADAPTATEURS" || t.includes("ngff m.2 / transfer card") || t.includes("national instruments")) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Cartes d'Extension Internes",
      sousCategorie: "Risers, Adaptateurs PCIe & Cartes d'Acquisition",
    };
  }

  if (t.includes("flexiblelom") || t.includes("546flr") || t.includes("556flr") || t.includes("366flr") || t.includes("x550-t2")) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Cartes d'Extension Internes",
      sousCategorie: "Cartes Réseau Internes (PCIe / FlexibleLOM)",
    };
  }

  // 4. Stations d'Accueil / Docks
  if (
    cat.includes("Station d'accueil") || t.includes("docking station") || t.includes("dock wd") ||
    t.includes("ultraslim dock") || t.includes("wavlink") ||
    t.includes("kensington universal usb-c") || t.includes("targus usb-c") ||
    t.includes("ultra dock")
  ) {
    return {
      famille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      categorie: "Stations d'Accueil & Hubs",
      sousCategorie: "Docks USB-C, Thunderbolt & Stations d'Accueil",
    };
  }

  // 5. Supports Écran
  if (
    t.includes("speaka") || t.includes("desk mount") || t.includes("desk stand") ||
    t.includes("support ecran") || t.includes("support de bureau")
  ) {
    return {
      famille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      categorie: "Accessoires Moniteurs",
      sousCategorie: "Supports & Bras Articulés pour Écrans",
    };
  }

  // 6. Visioconférence (incluant Lenovo ThinkSmart Hub 500)
  if (
    cat.includes("ÉQUIPEMENTS DE VIDÉOCONFÉRENCE") || t.includes("rally camera") ||
    t.includes("logitech group") || t.includes("logitech device") || t.includes("thinksmart hub")
  ) {
    return {
      famille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      categorie: "Audio & Vidéo Professionnelle",
      sousCategorie: "Systèmes de Visioconférence & Caméras",
    };
  }

  // 7. NAS / DAS
  if (
    cat.includes("NAS") || cat.includes("SAUVEGARDE") || t.includes("powervault") ||
    t.includes("readynas") || t.includes("diskstation") || t.includes("terastation") ||
    t.includes("qnap") || t.includes("rex-backup") || t.includes("beemo") ||
    t.includes("serveuur nas terra")
  ) {
    return {
      famille: "STOCKAGE",
      categorie: "Stockage Réseau & Baies (NAS / DAS)",
      sousCategorie: "Serveurs NAS, DAS & Sauvegarde",
    };
  }

  // =========================================================================
  // ORDINATEURS
  // =========================================================================
  // A. Laptops / PC Portables
  if (
    cat.toLowerCase() === "laptop" ||
    t.includes("thinkpad") || t.includes("latitude") || t.includes("thinkbook") ||
    t.includes("probook") || t.includes("elitebook") || t.includes("macbook") ||
    t.includes("vostro") || t.includes("portables") || t.includes("pc portable") ||
    t.includes("notebook") || t.includes("folio") || t.includes("yoga") ||
    t.includes("ideapad") || t.includes("zenbook") || t.includes("zbook firefly") ||
    t.includes("lifebook") || t.includes("dynabook") || t.includes("satellite pro") ||
    t.includes("extensa") || t.includes("xps 13") || t.includes("hp elite book")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Portables",
      sousCategorie: "Laptops & Ultrabooks",
    };
  }

  // B. Tout-en-un (All-in-One)
  if (
    cat === "All in One" || t.includes("all in one") || t.includes("all-in-one") ||
    t.includes("aio") || t.includes("tout en un") || t.includes("eliteone") ||
    t.includes("proone") || t.includes("pro one") || t.includes("optiplex 7410")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Tout-en-un",
      sousCategorie: "Tout-en-un (All-in-One)",
    };
  }

  // C. Matériel Point de Vente (POS / TPV)
  if (
    cat.includes("POS") || t.includes("micros workstation") || t.includes("aures yuno") ||
    t.includes("express station") || (cat.includes("Point de Vente") && !t.includes("hub 500"))
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "Matériel Point de Vente (POS)",
      sousCategorie: "Terminaux & Caisses Tactiles (TPV)",
    };
  }

  // D. Mini PC & Clients Légers
  if (
    cat.includes("MINI PC") || cat.includes("Mini pc") || t.includes("micro (intel") ||
    t.includes("tiny") || t.includes("pro mini") || t.includes("m715q") ||
    t.includes("m70q") || t.includes("m75q") || t.includes("dm 35w") ||
    t.includes("optiplex 3050 micro") || t.includes("optiplex 7050 micro") ||
    t.includes("t540 thin client") || t.includes("optiplex micro")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Tout-en-un",
      sousCategorie: "Mini PC & Clients Légers",
    };
  }

  // E. Stations de Travail & Gaming
  if (
    cat.includes("Station de travail") || t.includes("precision 5820") ||
    t.includes("precision 3640") || t.includes("hp z 440") || t.includes("hp z240") ||
    t.includes("thinkstation") || t.includes("thinkpadstation") || t.includes("workstation pro") ||
    t.includes("aurora r13") || t.includes("fractal design") || t.includes("2crsi")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Tout-en-un",
      sousCategorie: "Stations de Travail & PC Gaming",
    };
  }

  // F. Tours & Formats SFF
  if (
    cat.includes("PC BUREAU") || cat.includes("SSF") ||
    (cat.includes("ORDINATEURS") && !cat.includes("MINI") && !cat.includes("PORTABLE")) ||
    t.includes("prodesk") || t.includes("optiplex") || t.includes("thinkcentre") ||
    t.includes("microtower") || t.includes("elitedesk") || t.includes("vertirom") ||
    t.includes("maximpower") || t.includes("pro tower") || t.includes("elitedisk") ||
    t.includes("fuji sff") || t.includes("aspire xr") || t.includes("dell inspiron") ||
    t.includes("hp pavilion") || t.includes("hp 280 g2") || t.includes("hp 290 g1") ||
    t.includes("hp prodesk")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Tout-en-un",
      sousCategorie: "Tours & Formats SFF",
    };
  }

  // =========================================================================
  // SERVEURS & INFRASTRUCTURE COMPLETS
  // =========================================================================
  if (
    cat.includes("serveurs rack") || cat.includes("serveurs Tour") ||
    t.includes("proliant dl") || t.includes("proliant ml") || t.includes("poweredge") ||
    t.includes("thinksystem sr") || t.includes("thinksystem s530") || t.includes("rx2540") ||
    t.includes("s2600w") || (t.includes("serveur") && (t.includes("rack") || t.includes("tour")))
  ) {
    let sous = "Serveurs Rack (1U / 2U / 4U)";
    if (
      cat.includes("Tour") || t.includes("ml350") || t.includes("ml110") ||
      t.includes("ml10") || t.includes("t440") || t.includes("t430") ||
      t.includes("serveur tour")
    ) {
      sous = "Serveurs Tour";
    }
    return {
      famille: "SERVEURS & INFRASTRUCTURE",
      categorie: "Serveurs",
      sousCategorie: sous,
    };
  }

  // =========================================================================
  // PÉRIPHÉRIQUES & CONNECTIQUE
  // =========================================================================
  if (
    cat.includes("ecran") || cat.includes("Écran") || t.includes("elitedisplay") ||
    t.includes("thinkvision") || t.includes("s2725hs")
  ) {
    return {
      famille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      categorie: "Moniteurs & Affichage",
      sousCategorie: "Écrans & Moniteurs Bureautique / Pro",
    };
  }

  if (
    cat.includes("CLAVIERS") || t.includes("keyboard") || t.includes("clavier") ||
    t.includes("mouse") || t.includes("souris")
  ) {
    return {
      famille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      categorie: "Périphériques de Saisie",
      sousCategorie: "Claviers, Souris & Combos",
    };
  }

  if (t.includes("i-tec usb-c gigabit ethernet") || (cat === "Adapter" && t.includes("adaptateur réseau"))) {
    return {
      famille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      categorie: "Adaptateurs & Convertisseurs",
      sousCategorie: "Adaptateurs Réseau USB & Convertisseurs",
    };
  }

  if (cat === "Cable" || t.includes("usb-c to c")) {
    return {
      famille: "PÉRIPHÉRIQUES & CONNECTIQUE",
      categorie: "Câbles & Connectique",
      sousCategorie: "Câbles USB, Vidéo & Alimentation",
    };
  }

  // =========================================================================
  // IMPRESSION & CONSOMMABLES
  // =========================================================================
  if (
    cat.includes("CONSOMMABLES") || cat.includes("TONERS") || cat.includes("ENCRES") ||
    t.includes("toner") || t.includes("cartridge") || t.includes("ink supply")
  ) {
    let sous = "Toners & Tambours Laser";
    if ((t.includes("ink") || t.includes("encre") || t.includes("t945")) && !t.includes("toner") && !t.includes("cf283a")) {
      sous = "Cartouches d'Encre";
    }
    return {
      famille: "IMPRESSION & CONSOMMABLES",
      categorie: "Consommables d'Impression",
      sousCategorie: sous,
    };
  }

  if (
    cat.toLowerCase() === "imprimante" || t.includes("laserjet") ||
    t.includes("imprimante") || t.includes("imagerunner") ||
    t.includes("bizhub") || t.includes("toshiba b-ex") || t.includes("lexmark") ||
    t.includes("lbp6780")
  ) {
    let sous = "Imprimantes Laser & Multifonctions";
    if (t.includes("b-ex4d2") || t.includes("barcode printer") || t.includes("thermique") || t.includes("étiquette")) {
      sous = "Imprimantes Étiquettes & Code-barres";
    }
    return {
      famille: "IMPRESSION & CONSOMMABLES",
      categorie: "Imprimantes & Scanners",
      sousCategorie: sous,
    };
  }

  // =========================================================================
  // RÉSEAU ACTIF & COMMUTATION
  // =========================================================================
  if (
    cat.includes("RESEAU-SWITCHES") || t.includes("ws-c2960") || t.includes("sg350") ||
    t.includes("j9855a") || t.includes("je006a") || t.includes("gs752tpp") ||
    (t.includes("switch") && !t.includes("thinkswitch") && !t.includes("kvm") && !t.includes("support"))
  ) {
    return {
      famille: "RÉSEAU ACTIF & COMMUTATION",
      categorie: "Commutateurs & Routage",
      sousCategorie: "Switches Réseau (Manageables / PoE)",
    };
  }

  // =========================================================================
  // ÉLECTRICITÉ & ALIMENTATION
  // =========================================================================
  // Onduleurs
  if (
    cat.includes("ONDULEURS") || t.includes("9sx") || t.includes("5px") ||
    t.includes("9px") || t.includes("ellipse eco") || t.includes("onduleur") ||
    t.includes("ups") || t.includes("5p 850")
  ) {
    let sous = "Onduleurs (UPS) Tour & Rack";
    if (t.includes("ebm") || t.includes("batterie") || t.includes("power module")) {
      sous = "Modules Batterie & Accessoires UPS";
    }
    return {
      famille: "ÉLECTRICITÉ & ALIMENTATION",
      categorie: "Protection Électrique & Onduleurs",
      sousCategorie: sous,
    };
  }

  // Alimentations Serveur (Redondantes / Hot-Plug)
  if (
    cat.includes("ALIMENTATIONS SERVEUR") ||
    (cat === "COMPOSANTS" && (t.includes("blocs d'alimentation") || t.includes("psu"))) ||
    t.includes("flex slot") || t.includes("hstns-pl") || t.includes("n870p") ||
    t.includes("cwa2-0570") || t.includes("94y8109") || t.includes("psu serveur")
  ) {
    return {
      famille: "ÉLECTRICITÉ & ALIMENTATION",
      categorie: "Alimentations Internes",
      sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)",
    };
  }

  // Chargeurs PC Portables
  if (
    cat.includes("Chargeur") ||
    (cat === "Adapter" && (ref === "65w" || ref === "90w")) ||
    (t.includes("chargeur") && (t.includes("lenovo") || t.includes("dell") || t.includes("hp") || t.includes("type c") || t.includes("65w") || t.includes("90w") || t.includes("45w") || t.includes("130w") || t.includes("135w") || t.includes("150w")))
  ) {
    let sous = "Chargeurs Embout Propriétaire (Jack / Slim Tip)";
    if (t.includes("type c") || t.includes("type-c") || t.includes("usb-c")) {
      sous = "Chargeurs USB-C (Type-C)";
    }
    return {
      famille: "ÉLECTRICITÉ & ALIMENTATION",
      categorie: "Chargeurs & Alimentation Externe",
      sousCategorie: sous,
    };
  }

  // =========================================================================
  // MÉMOIRE VIVE (RAM)
  // =========================================================================
  if (
    cat.includes("RAM") || cat === "Samsung" || cat === "Kingston" ||
    cat === "SK hynix" || cat === "Micron" || cat === "PNY Technologies Europe" ||
    t.includes("rdimm") || t.includes("udimm") || t.includes("so-dimm") ||
    t.includes("ecc registered") || (t.includes("ddr4") && (t.includes("gb") || t.includes("go")))
  ) {
    let sous = "RAM Serveur (ECC Registered / RDIMM)";
    if (t.includes("udimm") || t.includes("m378a") || t.includes("hma851u") || t.includes("64c0jjfdl8g09") || t.includes("non-ecc")) {
      sous = "RAM PC Fixe (UDIMM / Non-ECC)";
    } else if (t.includes("so-dimm") || t.includes("sodimm") || t.includes("laptop ram")) {
      sous = "RAM PC Portable (SO-DIMM)";
    }
    return {
      famille: "MÉMOIRE & PROCESSEURS",
      categorie: "Mémoire Vive (RAM)",
      sousCategorie: sous,
    };
  }

  // =========================================================================
  // PROCESSEURS (CPU)
  // =========================================================================
  if (
    cat === "INTEL" || cat.includes("Processeurs") ||
    (cat === "COMPOSANTS" && t.includes("processeur")) ||
    t.includes("xeon e5-") || t.includes("i3 - ") || t.includes("i5 - ") || t.includes("i7 - ")
  ) {
    let sous = "Processeurs PC (Intel Core / AMD Ryzen)";
    if (t.includes("xeon") || t.includes("epyc") || t.includes("silver") || t.includes("gold")) {
      sous = "Processeurs Serveur (Intel Xeon / AMD EPYC)";
    }
    return {
      famille: "MÉMOIRE & PROCESSEURS",
      categorie: "Processeurs (CPU)",
      sousCategorie: sous,
    };
  }

  // =========================================================================
  // STOCKAGE (Disques SSD et HDD)
  // =========================================================================
  // SSD
  if (
    cat === "NVMe" || cat === "SATA" || cat.includes("SSD") ||
    t.includes("ssd") || t.includes("nvme") || t.includes("sabrent") ||
    t.includes("d7-p5520") || t.includes("pm981") || t.includes("870 evo") || t.includes("860 evo")
  ) {
    let sous = "Disques SSD 2,5\" SATA";
    if (cat.includes("SAS / NVMe") || t.includes("enterprise plus") || t.includes("kioxia") || t.includes("ibm storage") || t.includes("hpe 3.84tb") || t.includes("hpe 400gb") || t.includes("d7-p5520")) {
      sous = "Disques SSD Entreprise (SAS / U.2 PCIe)";
    } else if (t.includes("nvme") || t.includes("m.2") || t.includes("pcie gen") || cat === "NVMe") {
      sous = "Disques SSD M.2 NVMe & PCIe";
    }
    return {
      famille: "STOCKAGE",
      categorie: "Disques Flash (SSD)",
      sousCategorie: sous,
    };
  }

  // HDD
  if (
    cat.includes("HDD") || cat.includes("SAS — 2,5") || cat.includes("SAS— 2,5") ||
    cat.includes("SATA— 3,5") || cat.includes("Stockage-Disque SAS") ||
    t.includes("barracuda") || t.includes("skyhawk") || t.includes("wd blue") || t.includes("wd re3") || t.includes("exos")
  ) {
    let sous = "Disques Durs SAS 2,5\" (10K / 15K RPM)";
    if (cat.includes("3,5") || t.includes("3.5") || t.includes("3,5") || t.includes("exos") || t.includes("skyhawk") || t.includes("barracuda") || t.includes("re3") || t.includes("4to") || t.includes("2to") || t.includes("1to")) {
      if (t.includes("sas") || cat.includes("SAS")) {
        sous = "Disques Durs SAS 3,5\" (7.2K / 15K RPM)";
      } else {
        sous = "Disques Durs SATA 3,5\" (Bureautique / NAS)";
      }
    } else if (cat.includes("SATA") || t.includes("sata")) {
      sous = "Disques Durs SATA 2,5\"";
    }
    return {
      famille: "STOCKAGE",
      categorie: "Disques Durs Mécaniques (HDD)",
      sousCategorie: sous,
    };
  }

  // =========================================================================
  // COMPOSANTS & CARTES D'EXTENSION
  // =========================================================================
  if (
    cat === "CARTE GRAPHIQUE" || t.includes("rtx") || t.includes("gtx") ||
    t.includes("quadro") || t.includes("radeon") || t.includes("rx 580") ||
    t.includes("rx 570") || t.includes("p2200") || t.includes("p2000") ||
    t.includes("p6000") || ref === "A16"
  ) {
    let sous = "Cartes Graphiques Grand Public (GeForce / Radeon)";
    if (t.includes("quadro") || t.includes("p2000") || t.includes("p2200") || t.includes("p6000") || t.includes("a16") || t.includes("pro")) {
      sous = "Cartes Graphiques Professionnelles (Quadro / RTX Pro)";
    }
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Cartes Graphiques (GPU)",
      sousCategorie: sous,
    };
  }

  if (cat === "Cartes raid" || t.includes("smart array") || t.includes("430-8e") || t.includes("p440ar") || t.includes("p816i")) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Contrôleurs de Stockage",
      sousCategorie: "Contrôleurs RAID & Cartes HBA",
    };
  }

  // Fallback
  return {
    famille: "DIVERS",
    categorie: "Non Classé",
    sousCategorie: "À Classifier",
  };
}

// Run classification on all products
const results = products.map(p => ({ ...p, classification: classifyProduct(p) }));

const treeCounts: Record<string, Record<string, Record<string, { count: number, refs: Set<string> }>>> = {};
let unclassified = 0;

for (const r of results) {
  const f = r.classification.famille;
  const c = r.classification.categorie;
  const sc = r.classification.sousCategorie;

  if (f === "DIVERS") unclassified++;

  if (!treeCounts[f]) treeCounts[f] = {};
  if (!treeCounts[f][c]) treeCounts[f][c] = {};
  if (!treeCounts[f][c][sc]) treeCounts[f][c][sc] = { count: 0, refs: new Set() };

  treeCounts[f][c][sc].count++;
  treeCounts[f][c][sc].refs.add(r.reference);
}

console.log(`\n=== TAXONOMY RESULTS (${products.length} PRODUCTS TOTAL) ===`);
console.log(`Unclassified / Divers: ${unclassified}`);

let grandTotal = 0;
for (const [famille, cats] of Object.entries(treeCounts)) {
  let famTotal = 0;
  for (const [cat, sousCats] of Object.entries(cats)) {
    for (const [sc, data] of Object.entries(sousCats)) {
      famTotal += data.count;
    }
  }
  grandTotal += famTotal;
  console.log(`\n🏛️ FAMILLE : ${famille} (${famTotal} unités)`);
  for (const [cat, sousCats] of Object.entries(cats)) {
    let catTotal = Object.values(sousCats).reduce((s, d) => s + d.count, 0);
    console.log(`   📁 CATÉGORIE : ${cat} (${catTotal} unités)`);
    for (const [sc, data] of Object.entries(sousCats)) {
      console.log(`      🏷️ SOUS-CATÉGORIE : ${sc} -> ${data.count} unités (${data.refs.size} modèles)`);
    }
  }
}

console.log(`\nGRAND TOTAL COUNT: ${grandTotal} (Matches input ${products.length}: ${grandTotal === products.length})`);
