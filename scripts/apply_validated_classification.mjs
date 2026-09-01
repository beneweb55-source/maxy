import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = /^DATABASE_URL=(.+)$/m.exec(env)?.[1]?.trim() || /^DIRECT_URL=(.+)$/m.exec(env)?.[1]?.trim();

const prisma = new PrismaClient({ datasourceUrl: url });

const TREE = [
  {
    nom: "ORDINATEURS",
    ordre: 1,
    categories: [
      {
        nom: "PC Fixes & Stations",
        ordre: 1,
        sousCategories: [
          { nom: "Mini PC & Clients Légers", ordre: 1 },
          { nom: "Tours & Formats SFF", ordre: 2 },
          { nom: "Stations de Travail & Gaming", ordre: 3 },
          { nom: "Tout-en-un (All-in-One)", ordre: 4 },
        ]
      },
      {
        nom: "PC Portables",
        ordre: 2,
        sousCategories: [
          { nom: "Laptops & Ultrabooks", ordre: 1 }
        ]
      },
      {
        nom: "Matériel Point de Vente (POS)",
        ordre: 3,
        sousCategories: [
          { nom: "Terminaux & Caisses", ordre: 1 }
        ]
      }
    ]
  },
  {
    nom: "STOCKAGE",
    ordre: 2,
    categories: [
      {
        nom: "Disques Durs Mécaniques (HDD)",
        ordre: 1,
        sousCategories: [
          { nom: "Disques Durs SAS 3,5\"", ordre: 1 },
          { nom: "Disques Durs SATA 3,5\"", ordre: 2 },
          { nom: "Disques Durs SAS 2,5\"", ordre: 3 },
          { nom: "Disques Durs SATA 2,5\"", ordre: 4 }
        ]
      },
      {
        nom: "Disques Flash (SSD)",
        ordre: 2,
        sousCategories: [
          { nom: "SSD SATA 2,5\"", ordre: 1 },
          { nom: "SSD NVMe / M.2 & U.2", ordre: 2 },
          { nom: "SSD Entreprise SAS", ordre: 3 }
        ]
      },
      {
        nom: "Baies & Systèmes de Stockage (NAS/DAS)",
        ordre: 3,
        sousCategories: [
          { nom: "Serveurs NAS, DAS & Sauvegarde", ordre: 1 }
        ]
      }
    ]
  },
  {
    nom: "SERVEURS & BAIES",
    ordre: 3,
    categories: [
      {
        nom: "Serveurs",
        ordre: 1,
        sousCategories: [
          { nom: "Serveurs Rack (1U / 2U / 4U)", ordre: 1 },
          { nom: "Serveurs Tour", ordre: 2 },
          { nom: "Serveurs Multi-formats", ordre: 3 }
        ]
      },
      {
        nom: "Accessoires de Baies & Châssis",
        ordre: 2,
        sousCategories: [
          { nom: "Rails, PDU & Fixations", ordre: 1 }
        ]
      }
    ]
  },
  {
    nom: "ÉLECTRICITÉ & CONNECTIQUE",
    ordre: 4,
    categories: [
      {
        nom: "Chargeurs & Alimentation Externe",
        ordre: 1,
        sousCategories: [
          { nom: "Chargeurs PC Portables & Docks", ordre: 1 }
        ]
      },
      {
        nom: "Câbles & Adaptateurs de Signal",
        ordre: 2,
        sousCategories: [
          { nom: "Câbles Vidéo, Réseau & Convertisseurs", ordre: 1 }
        ]
      },
      {
        nom: "Protection Électrique & Onduleurs",
        ordre: 3,
        sousCategories: [
          { nom: "Onduleurs (UPS) & Régulateurs", ordre: 1 }
        ]
      }
    ]
  },
  {
    nom: "MÉMOIRE & PROCESSEURS",
    ordre: 5,
    categories: [
      {
        nom: "Mémoire Vive (RAM)",
        ordre: 1,
        sousCategories: [
          { nom: "RAM Serveur (ECC Registered)", ordre: 1 },
          { nom: "RAM PC Fixe (UDIMM)", ordre: 2 },
          { nom: "RAM PC Portable (SO-DIMM)", ordre: 3 }
        ]
      },
      {
        nom: "Processeurs (CPU)",
        ordre: 2,
        sousCategories: [
          { nom: "Processeurs PC (Intel Core / AMD Ryzen)", ordre: 1 },
          { nom: "Processeurs Serveur (Intel Xeon / AMD EPYC)", ordre: 2 }
        ]
      }
    ]
  },
  {
    nom: "IMPRESSION & CONSOMMABLES",
    ordre: 6,
    categories: [
      {
        nom: "Consommables d'Impression",
        ordre: 1,
        sousCategories: [
          { nom: "Toners, Cartouches & Tambours", ordre: 1 }
        ]
      },
      {
        nom: "Imprimantes & Scanners",
        ordre: 2,
        sousCategories: [
          { nom: "Imprimantes Laser, Jet d'encre & Thermiques", ordre: 1 }
        ]
      }
    ]
  },
  {
    nom: "ÉCRANS & PÉRIPHÉRIQUES",
    ordre: 7,
    categories: [
      {
        nom: "Périphériques de Saisie",
        ordre: 1,
        sousCategories: [
          { nom: "Claviers, Souris & Lecteurs Code-barres", ordre: 1 }
        ]
      },
      {
        nom: "Stations d'Accueil & Hubs",
        ordre: 2,
        sousCategories: [
          { nom: "Docks USB-C & Thunderbolt", ordre: 1 }
        ]
      },
      {
        nom: "Moniteurs & Écrans",
        ordre: 3,
        sousCategories: [
          { nom: "Écrans Bureautique & Pro", ordre: 1 }
        ]
      },
      {
        nom: "Accessoires Écrans",
        ordre: 4,
        sousCategories: [
          { nom: "Supports & Bras Articulés", ordre: 1 }
        ]
      },
      {
        nom: "Audio & Visioconférence",
        ordre: 5,
        sousCategories: [
          { nom: "Webcams, Micro-casques & Systèmes Visio", ordre: 1 }
        ]
      }
    ]
  },
  {
    nom: "COMPOSANTS & CARTES D'EXTENSION",
    ordre: 8,
    categories: [
      {
        nom: "Cartes Graphiques (GPU)",
        ordre: 1,
        sousCategories: [
          { nom: "Cartes Dédiées & Pro (Quadro/RTX)", ordre: 1 }
        ]
      },
      {
        nom: "Contrôleurs & Cartes Spécifiques",
        ordre: 2,
        sousCategories: [
          { nom: "Cartes Réseau Internes (PCIe/FlexLOM)", ordre: 1 },
          { nom: "Contrôleurs RAID, HBA & Risers", ordre: 2 }
        ]
      },
      {
        nom: "Alimentations Internes",
        ordre: 3,
        sousCategories: [
          { nom: "Alimentations Serveur (Redondantes)", ordre: 1 },
          { nom: "Alimentations PC Fixe", ordre: 2 }
        ]
      },
      {
        nom: "Refroidissement & Châssis",
        ordre: 4,
        sousCategories: [
          { nom: "Ventilateurs & Dissipateurs Thermiques", ordre: 1 }
        ]
      }
    ]
  },
  {
    nom: "RÉSEAU ACTIF & COMMUTATION",
    ordre: 9,
    categories: [
      {
        nom: "Équipements Réseau",
        ordre: 1,
        sousCategories: [
          { nom: "Switches, Routeurs & Bornes Wi-Fi", ordre: 1 }
        ]
      }
    ]
  }
];

function classifier(p) {
  const ref = p.reference.trim();
  const cat = (p.categorie || '').trim();
  const notes = (p.notes || '').trim();
  const t = `${ref} ${cat} ${notes}`.toLowerCase().replace(/\u200B/g, '');

  if (t.includes("j9855a") || (t.includes("switch") && !t.includes("support"))) {
    return {
      famille: "RÉSEAU ACTIF & COMMUTATION",
      categorie: "Équipements Réseau",
      sousCategorie: "Switches, Routeurs & Bornes Wi-Fi"
    };
  }

  if (t.includes("9sx") || t.includes("5px") || t.includes("9px") || t.includes("onduleur") || t.includes("ups") || t.includes("ellipse eco")) {
    return {
      famille: "ÉLECTRICITÉ & CONNECTIQUE",
      categorie: "Protection Électrique & Onduleurs",
      sousCategorie: "Onduleurs (UPS) & Régulateurs"
    };
  }

  // 1. ORDINATEURS
  if (
    t.includes("laptop") || t.includes("thinkpad") || t.includes("latitude") || 
    t.includes("elitebook") || t.includes("probook") || t.includes("macbook") || 
    t.includes("vostro") || t.includes("portables") || t.includes("pc portable") ||
    t.includes("notebook") || t.includes("folio") || t.includes("yoga") ||
    t.includes("dell 5400") || t.includes("dell 5480") || t.includes("dell 5490") || t.includes("dell 7480") || t.includes("dell 7490") || t.includes("hp 840") || t.includes("lenovo x280") || t.includes("lenovo t480") || t.includes("lenovo t490") || t.includes("lenovo l380") || t.includes("lenovo l390") || t.includes("lenovo l480") || t.includes("lenovo l490") || t.includes("lenovo l580") || t.includes("lenovo l590") || t.includes("lenovo x390") || t.includes("lenovo x13") || t.includes("lenovo t14") || t.includes("lenovo l13") || t.includes("lenovo l14") || t.includes("lenovo l15") || t.includes("lenovo x1 carbon") || t.includes("lenovo yoga") || t.includes("fujitsu lifebook") || t.includes("toshiba dynabook")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Portables",
      sousCategorie: "Laptops & Ultrabooks"
    };
  }

  if (
    t.includes("mini pc") || t.includes("tiny") || t.includes("micro") || 
    t.includes("dm (mini pc)") || t.includes("elitedesk mini") || t.includes("prodesk mini") ||
    t.includes("optiplex micro") || t.includes("m710q") || t.includes("m720q") || t.includes("m920q") ||
    t.includes("m70q") || t.includes("m80q") || t.includes("m90q") || t.includes("nuc") ||
    t.includes("thin client") || t.includes("t540") || t.includes("t630") || t.includes("wyse")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Stations",
      sousCategorie: "Mini PC & Clients Légers"
    };
  }

  if (
    t.includes("all in one") || t.includes("all-in-one") || t.includes("aio") ||
    t.includes("tout en un") || t.includes("optiplex aio") || t.includes("elitedesk aio")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Stations",
      sousCategorie: "Tout-en-un (All-in-One)"
    };
  }

  if (
    t.includes("precision") || t.includes("zbook") || t.includes("thinkstation") ||
    t.includes("workstation") || t.includes("station de travail") || t.includes("pc gamer") ||
    t.includes("gamer") || t.includes("gaming") || t.includes("t3600") || t.includes("t3610") ||
    t.includes("t5600") || t.includes("t5610") || t.includes("t7600") || t.includes("t7610") ||
    t.includes("z420") || t.includes("z440") || t.includes("z620") || t.includes("z640") ||
    t.includes("z820") || t.includes("z840") || t.includes("p500") || t.includes("p510") ||
    t.includes("p700") || t.includes("p710") || t.includes("p900") || t.includes("p910") ||
    t.includes("p330") || t.includes("p340") || t.includes("p350") || t.includes("p360")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Stations",
      sousCategorie: "Stations de Travail & Gaming"
    };
  }

  if (
    t.includes("optiplex") || t.includes("elitedesk") || t.includes("prodesk") || 
    t.includes("thinkcentre") || t.includes("pc bureau") || t.includes("desktop") || 
    t.includes("sff") || t.includes("mt ") || t.includes("tour ") || t.includes("tours ") ||
    t.includes("ordinateurs pc") || t.includes("ordinateurs de bureau")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "PC Fixes & Stations",
      sousCategorie: "Tours & Formats SFF"
    };
  }

  if (
    t.includes("pos") || t.includes("point de vente") || t.includes("caisse") ||
    t.includes("tactile") || t.includes("terminal caisse")
  ) {
    return {
      famille: "ORDINATEURS",
      categorie: "Matériel Point de Vente (POS)",
      sousCategorie: "Terminaux & Caisses"
    };
  }

  // 2. SERVEURS & BAIES
  if (
    t.includes("dl360") || t.includes("dl380") || t.includes("dl160") || t.includes("dl180") ||
    t.includes("r610") || t.includes("r710") || t.includes("r620") || t.includes("r720") ||
    t.includes("r630") || t.includes("r730") || t.includes("r640") || t.includes("r740") ||
    t.includes("r420") || t.includes("r430") || t.includes("r440") || t.includes("r220") ||
    t.includes("r230") || t.includes("r240") || t.includes("r320") || t.includes("r330") ||
    t.includes("poweredge r") || t.includes("proliant dl") || t.includes("serveurs rack") ||
    (t.includes("serveur") && t.includes("rack")) || t.includes("sr650") || t.includes("sr630") ||
    t.includes("sr550") || t.includes("sr530") || t.includes("x3650") || t.includes("x3550")
  ) {
    return {
      famille: "SERVEURS & BAIES",
      categorie: "Serveurs",
      sousCategorie: "Serveurs Rack (1U / 2U / 4U)"
    };
  }

  if (
    t.includes("ml350") || t.includes("ml310") || t.includes("ml110") || t.includes("ml150") ||
    t.includes("t320") || t.includes("t420") || t.includes("t620") || t.includes("t330") ||
    t.includes("t430") || t.includes("t630") || t.includes("t340") || t.includes("t440") ||
    t.includes("t640") || t.includes("t130") || t.includes("t140") || t.includes("t150") ||
    t.includes("serveur tour") || t.includes("serveurs tour") || t.includes("proliant ml") ||
    (t.includes("serveur") && (t.includes("tour") || t.includes("tower")))
  ) {
    return {
      famille: "SERVEURS & BAIES",
      categorie: "Serveurs",
      sousCategorie: "Serveurs Tour"
    };
  }

  if (
    t.includes("pdu") || t.includes("rail") || t.includes("kit rail") || t.includes("cable arm") ||
    t.includes("cma") || t.includes("armoire") || t.includes("baie") || t.includes("châssis") ||
    t.includes("caddy vide") || t.includes("caddy sas") || t.includes("tiroir rack")
  ) {
    return {
      famille: "SERVEURS & BAIES",
      categorie: "Accessoires de Baies & Châssis",
      sousCategorie: "Rails, PDU & Fixations"
    };
  }

  if (t.includes("serveur") || t.includes("proliant") || t.includes("poweredge") || t.includes("thinkserver")) {
    return {
      famille: "SERVEURS & BAIES",
      categorie: "Serveurs",
      sousCategorie: "Serveurs Multi-formats"
    };
  }

  // 3. STOCKAGE
  if (
    t.includes("disque sas") || t.includes("disques sas") || t.includes("sas 600") || 
    t.includes("sas 300") || t.includes("sas 900") || t.includes("sas 1.2") || 
    t.includes("sas 1,2") || t.includes("sas 1.8") || t.includes("sas 2.4") || 
    t.includes("sas 146") || t.includes("sas 450") || t.includes("sas 4tb") || 
    t.includes("sas 8tb") || t.includes("sas 10tb") || t.includes("sas 12tb") ||
    t.includes("sas 2,5") || t.includes("sas 2.5") || t.includes("sas 3,5") || t.includes("sas 3.5") ||
    (t.includes("sas") && (t.includes("hdd") || t.includes("10k") || t.includes("15k") || t.includes("rpm") || t.includes("seagate savvio") || t.includes("hgst ultrastar") || t.includes("cheetah") || t.includes("enterprise plus")))
  ) {
    const is35 = t.includes("3.5") || t.includes("3,5") || t.includes("4tb") || t.includes("8tb") || t.includes("10tb") || t.includes("12tb");
    return {
      famille: "STOCKAGE",
      categorie: "Disques Durs Mécaniques (HDD)",
      sousCategorie: is35 ? "Disques Durs SAS 3,5\"" : "Disques Durs SAS 2,5\""
    };
  }

  if (
    t.includes("ssd") || t.includes("nvme") || t.includes("m.2") || t.includes("pcie u.2") ||
    t.includes("p5520") || t.includes("pm981") || t.includes("pm983") || t.includes("pm883") ||
    t.includes("870 evo") || t.includes("860 evo") || t.includes("micron 5300") || t.includes("intel d7") ||
    t.includes("samsung 960gb") || t.includes("samsung 480gb") || t.includes("samsung 240gb") || t.includes("samsung 1.92tb")
  ) {
    let sous = "SSD SATA 2,5\"";
    if (t.includes("nvme") || t.includes("m.2") || t.includes("u.2") || t.includes("p5520") || t.includes("pm981") || t.includes("pcie")) {
      sous = "SSD NVMe / M.2 & U.2";
    } else if (t.includes("sas ssd") || t.includes("sas / nvme ssd")) {
      sous = "SSD Entreprise SAS";
    }
    return {
      famille: "STOCKAGE",
      categorie: "Disques Flash (SSD)",
      sousCategorie: sous
    };
  }

  if (
    (t.includes("sata") && (t.includes("hdd") || t.includes("5400") || t.includes("7200") || t.includes("barracuda") || t.includes("wd blue") || t.includes("wd black") || t.includes("wd red") || t.includes("ironwolf") || t.includes("western digital") || t.includes("toshiba dt01"))) ||
    t.includes("sata hdd") || t.includes("sata- 3,5") || t.includes("sata 3,5") || t.includes("sata 3.5") ||
    t.includes("sata 2.5") || t.includes("sata 500gb") || t.includes("sata 1tb") || t.includes("sata 2tb") ||
    t.includes("sata 4tb") || (t.includes("hdd") && !t.includes("sas")) || (t.includes("sata") && !t.includes("ssd"))
  ) {
    const is25 = t.includes("2.5") || t.includes("2,5");
    return {
      famille: "STOCKAGE",
      categorie: "Disques Durs Mécaniques (HDD)",
      sousCategorie: is25 ? "Disques Durs SATA 2,5\"" : "Disques Durs SATA 3,5\""
    };
  }

  if (
    t.includes("nas") || t.includes("das") || t.includes("synology") || t.includes("qnap") ||
    t.includes("sauvegarde") || t.includes("bande") || t.includes("lto") || t.includes("tape") ||
    t.includes("autoload") || t.includes("powervault") || t.includes("storageworks")
  ) {
    return {
      famille: "STOCKAGE",
      categorie: "Baies & Systèmes de Stockage (NAS/DAS)",
      sousCategorie: "Serveurs NAS, DAS & Sauvegarde"
    };
  }

  // 4. MÉMOIRE VIVE (RAM)
  if (
    t.includes("ram") || t.includes("mémoire") || t.includes("memoire") ||
    t.includes("rdimm") || t.includes("udimm") || t.includes("sodimm") ||
    t.includes("ddr3") || t.includes("ddr4") || t.includes("ddr5") ||
    t.includes("ecc") || t.includes("pc4-") || t.includes("pc3-") || t.includes("pc3l-") ||
    (t.includes("samsung") && (t.includes("gb") || t.includes("go")) && t.includes("2rx")) ||
    (t.includes("hynix") && (t.includes("gb") || t.includes("go")) && (t.includes("1rx") || t.includes("2rx"))) ||
    (t.includes("micron") && (t.includes("gb") || t.includes("go")) && (t.includes("1rx") || t.includes("2rx")))
  ) {
    let sous = "RAM PC Portable (SO-DIMM)";
    if (t.includes("rdimm") || t.includes("ecc reg") || t.includes("ecc") || t.includes("serveur") || t.includes("lrdimm")) {
      sous = "RAM Serveur (ECC Registered)";
    } else if (t.includes("udimm") || t.includes("desktop") || t.includes("non-ecc") || t.includes("pc bureau")) {
      sous = "RAM PC Fixe (UDIMM)";
    } else if (t.includes("sodimm") || t.includes("so-dimm") || t.includes("portable")) {
      sous = "RAM PC Portable (SO-DIMM)";
    } else {
      sous = t.includes("ecc") ? "RAM Serveur (ECC Registered)" : "RAM PC Fixe (UDIMM)";
    }
    return {
      famille: "MÉMOIRE & PROCESSEURS",
      categorie: "Mémoire Vive (RAM)",
      sousCategorie: sous
    };
  }

  // 5. PROCESSEURS (CPU)
  if (
    t.includes("processeur") || t.includes("cpu") || t.includes("xeon") ||
    t.includes("core i3") || t.includes("core i5") || t.includes("core i7") || t.includes("core i9") ||
    t.includes("i3 -") || t.includes("i5 -") || t.includes("i7 -") || t.includes("i9 -") ||
    t.includes("i3-") || t.includes("i5-") || t.includes("i7-") || t.includes("i9-") ||
    (t.includes("intel") && (t.includes("e5-") || t.includes("e3-") || t.includes("gold ") || t.includes("silver ") || t.includes("bronze ") || t.includes("platinum ") || t.includes("ghz") || t.includes("socket") || t.includes("lga") || t.includes("6100") || t.includes("6500") || t.includes("6700") || t.includes("7100") || t.includes("8100") || t.includes("9100") || t.includes("14 eme"))) ||
    t.includes("ryzen") || t.includes("epyc") || t.includes("threadripper")
  ) {
    let sous = "Processeurs PC (Intel Core / AMD Ryzen)";
    if (t.includes("xeon") || t.includes("epyc") || t.includes("gold") || t.includes("silver") || t.includes("bronze") || t.includes("e5-") || t.includes("e3-")) {
      sous = "Processeurs Serveur (Intel Xeon / AMD EPYC)";
    }
    return {
      famille: "MÉMOIRE & PROCESSEURS",
      categorie: "Processeurs (CPU)",
      sousCategorie: sous
    };
  }

  // 6. COMPOSANTS & CARTES D'EXTENSION
  if (
    t.includes("carte graphique") || t.includes("cartes graphiques") || t.includes("gpu") ||
    t.includes("nvidia") || t.includes("geforce") || t.includes("quadro") || t.includes("rtx") ||
    t.includes("gtx") || t.includes("radeon") || t.includes("amd firepro") || t.includes("matrox") ||
    t.includes("t1000") || t.includes("t600") || t.includes("t400") || t.includes("p400") ||
    t.includes("p600") || t.includes("p620") || t.includes("p1000") || t.includes("p2000") ||
    t.includes("k620") || t.includes("k2000") || t.includes("k4200") || t.includes("k5000")
  ) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Cartes Graphiques (GPU)",
      sousCategorie: "Cartes Dédiées & Pro (Quadro/RTX)"
    };
  }

  if (
    t.includes("raid") || t.includes("hba") || t.includes("smart array") || t.includes("perc") ||
    t.includes("megaraid") || t.includes("lsi") || t.includes("adaptec") || t.includes("p420") ||
    t.includes("p440") || t.includes("p822") || t.includes("p840") || t.includes("h240") ||
    t.includes("h330") || t.includes("h730") || t.includes("h740") || t.includes("h710") ||
    t.includes("riser") || t.includes("carte d'acquisition") || t.includes("carte d'extension") ||
    t.includes("430-8e")
  ) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Contrôleurs & Cartes Spécifiques",
      sousCategorie: "Contrôleurs RAID, HBA & Risers"
    };
  }

  if (
    t.includes("flexlom") || t.includes("x550") || t.includes("x520") || t.includes("x540") ||
    t.includes("carte reseau") || t.includes("carte réseau") || t.includes("10gbe") || t.includes("25gbe") ||
    t.includes("dual port") || t.includes("quad port") || t.includes("sfp+") || t.includes("bcm5719") ||
    t.includes("i350-t") || t.includes("560flr") || t.includes("530flr") || t.includes("331flr")
  ) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Contrôleurs & Cartes Spécifiques",
      sousCategorie: "Cartes Réseau Internes (PCIe/FlexLOM)"
    };
  }

  if (
    t.includes("alimentation") || t.includes("alimentations") || t.includes("power supply") ||
    t.includes("psu") || t.includes("750w") || t.includes("460w") || t.includes("500w") ||
    t.includes("800w") || t.includes("1100w") || t.includes("1200w") || t.includes("1400w") ||
    t.includes("1600w") || t.includes("platinum psu") || t.includes("gold psu") ||
    (t.includes("hpe") && t.includes("w") && !t.includes("switch")) || (t.includes("dell") && t.includes("w") && t.includes("psu"))
  ) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Alimentations Internes",
      sousCategorie: t.includes("serveur") || t.includes("platinum") || t.includes("cs ") || t.includes("hot-plug") || t.includes("flex slot") ? "Alimentations Serveur (Redondantes)" : "Alimentations PC Fixe"
    };
  }

  if (
    t.includes("refroidissement") || t.includes("ventilateur") || t.includes("fan") ||
    t.includes("heatsink") || t.includes("radiateur") || t.includes("watercooling")
  ) {
    return {
      famille: "COMPOSANTS & CARTES D'EXTENSION",
      categorie: "Refroidissement & Châssis",
      sousCategorie: "Ventilateurs & Dissipateurs Thermiques"
    };
  }

  // 7. ÉCRANS & AFFICHAGE
  if (
    t.includes("ecran") || t.includes("écran") || t.includes("moniteur") ||
    t.includes("display") || t.includes("pouces") || t.includes("24\"") || t.includes("27\"") ||
    t.includes("22\"") || t.includes("23\"") || t.includes("20\"") || t.includes("19\"") ||
    t.includes("dell p24") || t.includes("dell u24") || t.includes("hp e24") || t.includes("lenovo t24") ||
    t.includes("support ecran") || t.includes("bras ecran") || t.includes("monitor desk stand") ||
    t.includes("speaka professional")
  ) {
    if (t.includes("support") || t.includes("bras") || t.includes("pied") || t.includes("fixation") || t.includes("desk stand") || t.includes("speaka")) {
      return {
        famille: "ÉCRANS & PÉRIPHÉRIQUES",
        categorie: "Accessoires Écrans",
        sousCategorie: "Supports & Bras Articulés"
      };
    }
    return {
      famille: "ÉCRANS & PÉRIPHÉRIQUES",
      categorie: "Moniteurs & Écrans",
      sousCategorie: "Écrans Bureautique & Pro"
    };
  }

  // 8. PÉRIPHÉRIQUES, DOCKS & VISIO
  if (
    t.includes("dock") || t.includes("station d'accueil") || t.includes("port replicator") ||
    t.includes("wd15") || t.includes("wd19") || t.includes("wd22") || t.includes("tb16") ||
    t.includes("ultra dock") || t.includes("pro dock") || t.includes("basic dock") ||
    t.includes("usb-c dock") || t.includes("thunderbolt dock") || t.includes("hp 2013")
  ) {
    return {
      famille: "ÉCRANS & PÉRIPHÉRIQUES",
      categorie: "Stations d'Accueil & Hubs",
      sousCategorie: "Docks USB-C & Thunderbolt"
    };
  }

  if (
    t.includes("clavier") || t.includes("souris") || t.includes("mouse") ||
    t.includes("keyboard") || t.includes("trackpad") || t.includes("scanner code") ||
    t.includes("douchette") || t.includes("lecteur code")
  ) {
    return {
      famille: "ÉCRANS & PÉRIPHÉRIQUES",
      categorie: "Périphériques de Saisie",
      sousCategorie: "Claviers, Souris & Lecteurs Code-barres"
    };
  }

  if (
    t.includes("visio") || t.includes("vidéoconférence") || t.includes("videoconference") ||
    t.includes("webcam") || t.includes("micro") || t.includes("casque") || t.includes("audio") ||
    t.includes("polycom") || t.includes("jabra") || t.includes("logitech meet") || t.includes("thinksmart") ||
    t.includes("haut-parleur") || t.includes("speakerphone") || t.includes("rally camera") ||
    t.includes("logitech group") || t.includes("logitech device")
  ) {
    return {
      famille: "ÉCRANS & PÉRIPHÉRIQUES",
      categorie: "Audio & Visioconférence",
      sousCategorie: "Webcams, Micro-casques & Systèmes Visio"
    };
  }

  // 9. ÉLECTRICITÉ, CÂBLES & CHARGEURS
  if (
    t.includes("chargeur") || t.includes("adapter") || t.includes("adaptateur secteur") ||
    (t.includes("65w") && !t.includes("pc")) || (t.includes("90w") && !t.includes("pc")) ||
    (t.includes("45w") && !t.includes("pc")) || (t.includes("130w") && !t.includes("pc")) ||
    (t.includes("usb-c") && t.includes("w") && t.includes("charge"))
  ) {
    return {
      famille: "ÉLECTRICITÉ & CONNECTIQUE",
      categorie: "Chargeurs & Alimentation Externe",
      sousCategorie: "Chargeurs PC Portables & Docks"
    };
  }

  if (
    t.includes("cable") || t.includes("câble") || t.includes("cordon") ||
    t.includes("hdmi") || t.includes("displayport") || t.includes("dp to") ||
    t.includes("vga") || t.includes("dvi") || t.includes("rj45") || t.includes("ethernet") ||
    t.includes("patch cord") || t.includes("usb to") || t.includes("adaptateur réseau usb") ||
    t.includes("adaptateurs")
  ) {
    return {
      famille: "ÉLECTRICITÉ & CONNECTIQUE",
      categorie: "Câbles & Adaptateurs de Signal",
      sousCategorie: "Câbles Vidéo, Réseau & Convertisseurs"
    };
  }

  // 10. IMPRESSION & CONSOMMABLES
  if (
    t.includes("imprimante") || t.includes("printer") || t.includes("laserjet") ||
    t.includes("deskjet") || t.includes("ecotank") || t.includes("multifacette") ||
    t.includes("copieur") || t.includes("multifonction") || t.includes("zebra") ||
    t.includes("thermique") || t.includes("ticket")
  ) {
    return {
      famille: "IMPRESSION & CONSOMMABLES",
      categorie: "Imprimantes & Scanners",
      sousCategorie: "Imprimantes Laser, Jet d'encre & Thermiques"
    };
  }

  if (
    t.includes("toner") || t.includes("cartouche") || t.includes("encre") ||
    t.includes("ruban") || t.includes("tambour") || t.includes("drum") ||
    t.includes("consommables") || t.includes("cf2") || t.includes("q26") || t.includes("ce5")
  ) {
    return {
      famille: "IMPRESSION & CONSOMMABLES",
      categorie: "Consommables d'Impression",
      sousCategorie: "Toners, Cartouches & Tambours"
    };
  }

  return {
    famille: "ORDINATEURS",
    categorie: "PC Fixes & Stations",
    sousCategorie: "Tours & Formats SFF"
  };
}

async function main() {
  console.log("=== DÉBUT DU PEUPLEMENT DE LA TAXONOMIE RELATIONNELLE ===");

  // Étape 1 : Construction de l'arbre Categorie
  const leafMap = new Map(); // key: "Famille_Categorie_SousCategorie" -> id

  for (const f of TREE) {
    let famille = await prisma.categorie.findFirst({
      where: { nom: f.nom, parent_id: null }
    });
    if (!famille) {
      famille = await prisma.categorie.create({
        data: { nom: f.nom, ordre: f.ordre }
      });
      console.log(`[+] Famille créée : ${f.nom} (#${famille.id})`);
    } else {
      await prisma.categorie.update({
        where: { id: famille.id },
        data: { ordre: f.ordre }
      });
    }

    for (const c of f.categories) {
      let categorie = await prisma.categorie.findFirst({
        where: { nom: c.nom, parent_id: famille.id }
      });
      if (!categorie) {
        categorie = await prisma.categorie.create({
          data: { nom: c.nom, parent_id: famille.id, ordre: c.ordre }
        });
        console.log(`  [+] Catégorie créée : ${c.nom} (#${categorie.id})`);
      } else {
        await prisma.categorie.update({
          where: { id: categorie.id },
          data: { ordre: c.ordre }
        });
      }

      for (const s of c.sousCategories) {
        let scat = await prisma.categorie.findFirst({
          where: { nom: s.nom, parent_id: categorie.id }
        });
        if (!scat) {
          scat = await prisma.categorie.create({
            data: { nom: s.nom, parent_id: categorie.id, ordre: s.ordre }
          });
          console.log(`    [+] Sous-catégorie créée : ${s.nom} (#${scat.id})`);
        } else {
          await prisma.categorie.update({
            where: { id: scat.id },
            data: { ordre: s.ordre }
          });
        }
        leafMap.set(`${f.nom}|||${c.nom}|||${s.nom}`, scat.id);
      }
    }
  }

  console.log(`Arbre des catégories synchronisé avec succès (${leafMap.size} feuilles).`);

  // Étape 2 : Récupération et classification de tous les produits
  const produits = await prisma.produit.findMany({
    select: {
      id: true,
      reference: true,
      categorie: true,
      notes: true,
      prix_vente_fixe: true,
    },
    orderBy: { id: "asc" }
  });

  console.log(`\nTraitement de ${produits.length} produits...`);

  // Cache des modèles créés par couple (nom_modele, categorie_id)
  const modeleCache = new Map();

  let produitsRelies = 0;
  let modelesCrees = 0;

  for (const p of produits) {
    const classification = classifier(p);
    const leafKey = `${classification.famille}|||${classification.categorie}|||${classification.sousCategorie}`;
    const categorieId = leafMap.get(leafKey);

    if (!categorieId) {
      console.error(`Erreur: feuille introuvable pour ${leafKey}`);
      continue;
    }

    const nomModele = p.reference.trim();
    const modeleKey = `${nomModele}|||${categorieId}`;

    let modeleId = modeleCache.get(modeleKey);
    if (!modeleId) {
      let modele = await prisma.modele.findFirst({
        where: { nom: nomModele, categorie_id: categorieId }
      });

      if (!modele) {
        modele = await prisma.modele.create({
          data: {
            nom: nomModele,
            categorie_id: categorieId,
            prix_vente_conseille: p.prix_vente_fixe ? Number(p.prix_vente_fixe) : null
          }
        });
        modelesCrees++;
      }
      modeleId = modele.id;
      modeleCache.set(modeleKey, modeleId);
    }

    // Mise à jour de l'exemplaire (produit) avec categorie_id et modele_id
    await prisma.produit.update({
      where: { id: p.id },
      data: {
        categorie_id: categorieId,
        modele_id: modeleId
      }
    });

    produitsRelies++;
    if (produitsRelies % 250 === 0 || produitsRelies === produits.length) {
      console.log(`Progression : ${produitsRelies} / ${produits.length} produits rattachés...`);
    }
  }

  console.log(`\n=== TERMINÉ AVEC SUCCÈS ===`);
  console.log(`- Catégories feuilles actives : ${leafMap.size}`);
  console.log(`- Modèles uniques créés/utilisés : ${modeleCache.size}`);
  console.log(`- Produits rattachés : ${produitsRelies} / ${produits.length} (100 %)`);
}

main()
  .catch((e) => {
    console.error("Erreur d'exécution :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
