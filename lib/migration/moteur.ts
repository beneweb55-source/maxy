import crypto from "crypto";
import { FAMILLES } from "@/lib/taxonomie-canonical";

/**
 * Moteur d'analyse de migration — regroupe les produits par (catégorie, référence)
 * et propose une cible dans l'arbre canonique.
 *
 * Les noms de familles/catégories doivent correspondre EXACTEMENT à ceux de
 * taxonomie-canonical.ts / classify route TREE pour que l'auto-migrate crée
 * des enregistrements cohérents.
 */

export interface AnalyseResultat {
  id: string;
  groupe_categorie: string;
  groupe_reference: string;
  cible_famille_nom: string | null;
  cible_categorie_nom: string | null;
  cible_modele_nom: string | null;
  cible_attributs: Record<string, any> | null;
  statut: "en_attente" | "conflit" | "valide" | "rejete";
  confiance: number;
  raisons: string[];
  nb_produits: number;
}

export function genererHashGroupe(categorie: string, reference: string): string {
  return crypto.createHash("sha256").update(`${categorie}|${reference}`).digest("hex");
}

// ─── Noms canoniques des catégories (niveau 2 dans l'arbre) ───
// Ces noms correspondent EXACTEMENT aux catégories créées par le TREE dans classify/route.ts
const CAT = {
  PC_PORTABLES: "PC Portables",
  PC_FIXES: "PC Fixes & Tout-en-un",
  POS: "Matériel Point de Vente (POS)",
  SERVEURS: "Serveurs",
  ACCESSOIRES_CHASSIS: "Accessoires Châssis & Baies",
  DISQUES_DURS: "Disques Durs Mécaniques (HDD)",
  SSD: "Disques Flash (SSD)",
  STOCKAGE_RESEAU: "Stockage Réseau & Baies (NAS / DAS)",
  MEMOIRE_VIVE: "Mémoire Vive (RAM)",
  PROCESSEURS: "Processeurs (CPU)",
  CARTES_GRAPHIQUES: "Cartes Graphiques (GPU)",
  REFROIDISSEMENT: "Refroidissement & Châssis",
  CONTROLEURS: "Contrôleurs de Stockage",
  CARTES_EXTENSION: "Cartes d'Extension Internes",
  MONITEURS: "Moniteurs & Affichage",
  PERIPH_SAISIE: "Périphériques de Saisie",
  STATIONS_ACCUEIL: "Stations d'Accueil & Hubs",
  SUPPORTS_ECRAN: "Accessoires Moniteurs",
  VISIO: "Audio & Vidéo Professionnelle",
  CABLES: "Câbles & Connectique",
  ADAPTATEURS: "Adaptateurs & Convertisseurs",
  CHARGEURS: "Chargeurs & Alimentation Externe",
  ALIM_INTERNE: "Alimentations Internes",
  ONDULEURS: "Protection Électrique & Onduleurs",
  IMPRIMANTES: "Imprimantes & Scanners",
  CONSOMMABLES: "Consommables d'Impression",
  SWITCHES: "Commutateurs & Routage",
} as const;

export function analyserGroupe(categorieLegacy: string, referenceLegacy: string, nbProduits: number): AnalyseResultat {
  const raisons: string[] = [];
  let confiance = 0;
  let conflit = false;

  const texteComplet = `${categorieLegacy} ${referenceLegacy}`.toLowerCase();

  const attributs: Record<string, any> = {};

  let familleTrouvee: string | null = null;
  let categorieTrouvee: string | null = null;
  let modeleNom: string = referenceLegacy.trim();

  // ============================================
  // DICTIONNAIRES DE DÉTECTION (PAR ORDRE DE PRIORITÉ)
  // Noms conformes à la taxonomie canonique (FAMILLES + TREE)
  // ============================================

  // 1. DÉTECTION ORDINATEURS (Laptops, Mini PC, PC Bureau)
  if (texteComplet.includes("laptop") || texteComplet.includes("notebook") || texteComplet.includes("thinkpad") || texteComplet.includes("latitude") || texteComplet.includes("macbook") || texteComplet.includes("vostro") || texteComplet.includes("elitebook") || texteComplet.includes("probook")) {
    familleTrouvee = FAMILLES.INFORMATIQUE;
    categorieTrouvee = CAT.PC_PORTABLES;
    raisons.push("✓ Type détecté : PC Portable");
    confiance += 50;

    // Déduction gamme
    if (texteComplet.includes("latitude")) modeleNom = "Dell Latitude";
    else if (texteComplet.includes("vostro")) modeleNom = "Dell Vostro";
    else if (texteComplet.includes("thinkpad")) modeleNom = "Lenovo ThinkPad";
    else if (texteComplet.includes("elitebook")) modeleNom = "HP EliteBook";
    else if (texteComplet.includes("probook")) modeleNom = "HP ProBook";
    else modeleNom = "PC Portable (Gamme non détectée)";

    // Attribut CPU/RAM
    const matchCPU = texteComplet.match(/\b(i[3579]|ryzen\s*\d)\b/);
    if (matchCPU && matchCPU[1]) attributs["CPU"] = matchCPU[1].toUpperCase();
    const matchRAM = texteComplet.match(/\b(\d+)\s*(gb|go)\b/);
    if (matchRAM && matchRAM[1]) attributs["RAM"] = `${matchRAM[1]}GB`;

    attributs["Details"] = referenceLegacy;
  }
  else if (texteComplet.includes("mini pc") || texteComplet.match(/\b(tiny|micro|ssf|sff)\b/)) {
    familleTrouvee = FAMILLES.INFORMATIQUE;
    categorieTrouvee = CAT.PC_FIXES;
    confiance += 50;
    modeleNom = "Mini PC";
  }
  else if (texteComplet.includes("all in one") || texteComplet.includes("aio") || texteComplet.includes("tout en un")) {
    familleTrouvee = FAMILLES.INFORMATIQUE;
    categorieTrouvee = CAT.PC_FIXES;
    confiance += 50;
    modeleNom = "All-in-One";
  }
  else if (texteComplet.includes("station de travail")) {
    familleTrouvee = FAMILLES.INFORMATIQUE;
    categorieTrouvee = CAT.PC_FIXES;
    confiance += 50;
    modeleNom = "Station de travail";
  }
  else if (texteComplet.includes("pc bureau") || texteComplet.includes("desktop")) {
    familleTrouvee = FAMILLES.INFORMATIQUE;
    categorieTrouvee = CAT.PC_FIXES;
    confiance += 50;
    modeleNom = "PC de Bureau";
  }

  // 2. DÉTECTION TERMINAUX POS
  else if (texteComplet.includes("pos") || texteComplet.includes("caisse") || texteComplet.includes("tiroir") || texteComplet.includes("douchette") || texteComplet.includes("ticket")) {
    familleTrouvee = FAMILLES.INFORMATIQUE;
    categorieTrouvee = CAT.POS;
    confiance += 50;
    modeleNom = "Terminal POS";
  }

  // 3. DÉTECTION SERVEURS
  else if (texteComplet.includes("serveur") || texteComplet.includes("proliant") || texteComplet.includes("poweredge")) {
    familleTrouvee = FAMILLES.SERVEURS;
    confiance += 50;
    if (texteComplet.includes("rack") || texteComplet.includes("dl360") || texteComplet.includes("dl380") || texteComplet.includes("r630") || texteComplet.includes("r440") || texteComplet.includes("r2950")) {
      categorieTrouvee = CAT.SERVEURS;
      modeleNom = "Serveur Rack";
    } else if (texteComplet.includes("tour") || texteComplet.includes("ml350") || texteComplet.includes("t440") || texteComplet.includes("t430")) {
      categorieTrouvee = CAT.SERVEURS;
      modeleNom = "Serveur Tour";
    } else {
      categorieTrouvee = CAT.SERVEURS;
      modeleNom = "Serveur";
      raisons.push("⚠ Type serveur non précisé, classé Rack par défaut");
    }
  }

  // 4. DÉTECTION STOCKAGE (SATA, SAS, NVMe, SSD, HDD, NAS)
  else if (texteComplet.match(/\b(ssd|hdd|sas|sata|nvme|nas)\b/)) {
    familleTrouvee = FAMILLES.STOCKAGE;
    confiance += 50;

    if (texteComplet.includes("nas") || texteComplet.includes("sauvegarde") || texteComplet.includes("das")) {
      categorieTrouvee = CAT.STOCKAGE_RESEAU;
      raisons.push("✓ Technologie : NAS/DAS");
    } else if (texteComplet.includes("ssd") || texteComplet.includes("nvme")) {
      categorieTrouvee = CAT.SSD;
      raisons.push("✓ Technologie : SSD");
      if (texteComplet.includes("nvme")) {
        attributs["sousCategorie"] = "NVMe";
      } else {
        attributs["sousCategorie"] = "SATA";
      }
    } else if (texteComplet.includes("hdd") || texteComplet.includes("7.2k") || texteComplet.includes("10k") || texteComplet.includes("15k") || texteComplet.includes("disque sas")) {
      categorieTrouvee = CAT.DISQUES_DURS;
      raisons.push("✓ Technologie : Disque Dur (HDD)");
      if (texteComplet.includes("sas")) {
        attributs["sousCategorie"] = "SAS";
      } else {
        attributs["sousCategorie"] = "SATA";
      }
    } else {
      categorieTrouvee = CAT.DISQUES_DURS;
      confiance -= 20;
      raisons.push("⚠ HDD/SSD non précisé, classé HDD par défaut");
    }

    // Attributs Stockage
    if (texteComplet.includes("sata")) attributs["Interface"] = "SATA";
    if (texteComplet.includes("sas")) attributs["Interface"] = "SAS";
    if (texteComplet.includes("nvme") || texteComplet.includes("pcle") || texteComplet.includes("pcie")) attributs["Interface"] = "NVMe";

    const matchCapaciteGB = texteComplet.match(/\b(\d+)\s*(gb|go)\b/);
    if (matchCapaciteGB) attributs["Capacité"] = `${matchCapaciteGB[1]}GB`;

    const matchCapaciteTB = texteComplet.match(/\b(\d+)\s*(tb|to)\b/);
    if (matchCapaciteTB) attributs["Capacité"] = `${matchCapaciteTB[1]}TB`;

    const matchRPM = texteComplet.match(/\b(\d+(\.\d+)?)k\s*rpm\b/);
    if (matchRPM) attributs["Vitesse"] = `${matchRPM[1]}K RPM`;

    const matchFormat = texteComplet.match(/\b(2\.5|3\.5)["']?\b/);
    if (matchFormat) attributs["Format"] = `${matchFormat[1]}"`;

    modeleNom = attributs["Interface"] || "Interface Inconnue";
  }

  // 5. DÉTECTION MÉMOIRE RAM (sous sa propre famille MÉMOIRE)
  else if (texteComplet.includes("ram ") || texteComplet.includes("ddr3") || texteComplet.includes("ddr4") || texteComplet.includes("ddr5") || texteComplet.includes("udimm") || texteComplet.includes("rdimm") || texteComplet.includes("ecc ") || texteComplet.includes("sodimm") || (categorieLegacy === "Samsung" && texteComplet.includes("gb")) || (categorieLegacy === "Kingston") || (categorieLegacy === "Micron") || texteComplet.includes("sk hynix")) {
    familleTrouvee = FAMILLES.MEMOIRE;
    confiance += 50;
    raisons.push("✓ Type détecté : Mémoire RAM");

    categorieTrouvee = CAT.MEMOIRE_VIVE;
    if (texteComplet.includes("sodimm") || texteComplet.includes("laptop ram")) {
      attributs["sousCategorie"] = "RAM PC Portable (SO-DIMM)";
    } else if (texteComplet.includes("rdimm") || texteComplet.includes("lrdimm") || texteComplet.includes("ecc reg")) {
      attributs["sousCategorie"] = "RAM Serveur (ECC Registered / RDIMM)";
    } else {
      attributs["sousCategorie"] = "RAM PC Fixe (UDIMM / Non-ECC)";
    }

    if (texteComplet.includes("ddr3")) attributs["Type"] = "DDR3";
    if (texteComplet.includes("ddr4")) attributs["Type"] = "DDR4";
    if (texteComplet.includes("ddr5")) attributs["Type"] = "DDR5";
    if (texteComplet.includes("ecc") || texteComplet.includes("registered")) attributs["ECC"] = "Oui";

    const matchCapacite = texteComplet.match(/\b(\d+)\s*(gb|go)\b/);
    if (matchCapacite) attributs["Capacité"] = `${matchCapacite[1]}GB`;

    modeleNom = `${attributs["Type"] || "RAM"} ${attributs["ECC"] ? "ECC" : "Non-ECC"}`;
  }

  // 6. DÉTECTION PROCESSEURS
  else if (texteComplet.includes("processeur") || texteComplet.includes("intel") || texteComplet.includes("amd ") || (texteComplet.includes(" i3 ") || texteComplet.includes(" i5 ") || texteComplet.includes(" i7 ") || texteComplet.includes(" i9 "))) {
    familleTrouvee = FAMILLES.COMPOSANTS;
    categorieTrouvee = CAT.PROCESSEURS;
    confiance += 50;

    if (texteComplet.includes("intel") || texteComplet.includes(" i3") || texteComplet.includes(" i5") || texteComplet.includes(" i7") || texteComplet.includes(" i9")) {
      modeleNom = "Intel Core";
    } else if (texteComplet.includes("xeon")) {
      modeleNom = "Intel Xeon";
    } else if (texteComplet.includes("ryzen")) {
      modeleNom = "AMD Ryzen";
    } else {
      modeleNom = "Processeur";
    }
  }

  // 7. DÉTECTION CARTES GRAPHIQUES
  else if (texteComplet.includes("carte graphique") || texteComplet.includes("radeon") || texteComplet.includes("geforce") || texteComplet.includes("quadro") || texteComplet.includes("rtx ") || texteComplet.includes("gtx ") || texteComplet.includes("rx ")) {
    familleTrouvee = FAMILLES.COMPOSANTS;
    categorieTrouvee = CAT.CARTES_GRAPHIQUES;
    confiance += 50;
    modeleNom = "Carte Graphique";
  }

  // 8. DÉTECTION IMPRIMANTES / CONSOMMABLES
  else if (texteComplet.includes("imprimante") || texteComplet.includes("toner") || texteComplet.includes("ink ") || texteComplet.includes("encre") || texteComplet.includes("cartridge") || texteComplet.includes("scanner")) {
    familleTrouvee = FAMILLES.IMPRESSION;
    confiance += 50;
    if (texteComplet.includes("toner") || texteComplet.includes("ink") || texteComplet.includes("encre") || texteComplet.includes("cartridge") || texteComplet.includes("consommable")) {
      categorieTrouvee = CAT.CONSOMMABLES;
      modeleNom = "Toner / Encre";
    } else {
      categorieTrouvee = CAT.IMPRIMANTES;
      modeleNom = "Imprimante";
    }
  }

  // 9. DÉTECTION ÉCRANS
  else if (texteComplet.includes("ecran") || texteComplet.includes("monitor") || texteComplet.includes("moniteur") || texteComplet.includes("ultrasharp") || texteComplet.includes("thinkvision")) {
    familleTrouvee = FAMILLES.PERIPHERIQUES;
    categorieTrouvee = CAT.MONITEURS;
    confiance += 50;
    modeleNom = "Écran";
  }

  // 10. DÉTECTION PÉRIPHÉRIQUES (Claviers, Souris, Stations d'accueil, Supports)
  else if (texteComplet.includes("clavier") || texteComplet.includes("keyboard") || texteComplet.includes("souris") || texteComplet.includes("mouse")) {
    familleTrouvee = FAMILLES.PERIPHERIQUES;
    categorieTrouvee = CAT.PERIPH_SAISIE;
    confiance += 50;
    modeleNom = "Clavier / Souris";
  }
  else if (texteComplet.includes("dock") || texteComplet.includes("station d'accueil") || texteComplet.includes("hub usb")) {
    familleTrouvee = FAMILLES.PERIPHERIQUES;
    categorieTrouvee = CAT.STATIONS_ACCUEIL;
    confiance += 50;
    modeleNom = "Station d'accueil";
  }
  else if (texteComplet.includes("stand") || texteComplet.includes("support ecran") || texteComplet.includes("bras articulé")) {
    familleTrouvee = FAMILLES.PERIPHERIQUES;
    categorieTrouvee = CAT.SUPPORTS_ECRAN;
    confiance += 50;
    modeleNom = "Support écran";
  }
  else if (texteComplet.includes("webcam") || texteComplet.includes("camera") || texteComplet.includes("visio")) {
    familleTrouvee = FAMILLES.PERIPHERIQUES;
    categorieTrouvee = CAT.VISIO;
    confiance += 50;
    modeleNom = "Webcam";
  }

  // 11. DÉTECTION CHARGEURS & CÂBLES
  else if (texteComplet.includes("chargeur") || texteComplet.includes("adapter") || texteComplet.match(/\b(\d+)w\b/)) {
    familleTrouvee = FAMILLES.ALIMENTATION;
    categorieTrouvee = CAT.CHARGEURS;
    raisons.push("✓ Type détecté : Chargeur / Alimentation");
    confiance += 50;

    const matchPuissance = texteComplet.match(/\b(\d+)w\b/);
    if (matchPuissance) {
      attributs["Puissance"] = `${matchPuissance[1]}W`;
      modeleNom = `${matchPuissance[1]}W`;
    } else {
      modeleNom = "Générique";
      confiance -= 20;
      raisons.push("⚠ Puissance introuvable");
    }
  }
  else if (texteComplet.includes("onduleur") || texteComplet.includes("ups")) {
    familleTrouvee = FAMILLES.ALIMENTATION;
    categorieTrouvee = CAT.ONDULEURS;
    confiance += 50;
    modeleNom = "Onduleur";
  }
  else if (texteComplet.includes("cable") || texteComplet.includes("câble") || texteComplet.includes("hdmi") || texteComplet.includes("displayport") || texteComplet.includes("usb") || texteComplet.includes("ethernet") || texteComplet.includes("rj45")) {
    familleTrouvee = FAMILLES.PERIPHERIQUES;
    categorieTrouvee = CAT.CABLES;
    confiance += 50;
    modeleNom = "Câble";
  }

  // 12. DÉTECTION RESEAU (switch, routeur, access point)
  else if (texteComplet.includes("switch") || texteComplet.includes("routeur") || texteComplet.includes("firewall") || texteComplet.includes("access point") || texteComplet.includes("cisco") || texteComplet.includes("mikrotik") || texteComplet.includes("unifi") || texteComplet.includes("ubiquiti")) {
    familleTrouvee = FAMILLES.RESEAU;
    categorieTrouvee = CAT.SWITCHES;
    confiance += 50;
    modeleNom = "Switch / Routeur";
  }

  // 13. DÉTECTION ALIMENTATIONS SERVEUR
  else if (texteComplet.includes("alimentation") && (texteComplet.includes("serveur") || texteComplet.includes("psu") || texteComplet.includes("hpe") || texteComplet.includes("dell"))) {
    familleTrouvee = FAMILLES.ALIMENTATION;
    categorieTrouvee = CAT.ALIM_INTERNE;
    confiance += 50;
    modeleNom = "Alimentation Serveur";
  }

  // 14. DÉTECTION CONTRÔLEURS RAID
  else if (texteComplet.includes("raid") || texteComplet.includes("hba") || texteComplet.includes("controlleur")) {
    familleTrouvee = FAMILLES.COMPOSANTS;
    categorieTrouvee = CAT.CONTROLEURS;
    confiance += 50;
    modeleNom = "Contrôleur RAID";
  }

  // 15. DÉTECTION CARTES RÉSEAU
  else if (texteComplet.includes("carte reseau") || texteComplet.includes("carte réseau") || texteComplet.includes("network card")) {
    familleTrouvee = FAMILLES.COMPOSANTS;
    categorieTrouvee = CAT.CARTES_EXTENSION;
    confiance += 50;
    modeleNom = "Carte Réseau";
  }

  // 16. DÉTECTION RISERS / ADAPTATEURS
  else if (texteComplet.includes("riser") || texteComplet.includes("adaptateur") || texteComplet.includes("dongle")) {
    familleTrouvee = FAMILLES.PERIPHERIQUES;
    categorieTrouvee = CAT.ADAPTATEURS;
    confiance += 50;
    modeleNom = "Adaptateur / Riser";
  }

  // 17. DÉTECTION REFROIDISSEMENT
  else if (texteComplet.includes("ventilateur") || texteComplet.includes("fan") || texteComplet.includes("refroidissement")) {
    familleTrouvee = FAMILLES.COMPOSANTS;
    categorieTrouvee = CAT.REFROIDISSEMENT;
    confiance += 50;
    modeleNom = "Ventilateur";
  }

  // 18. DÉTECTION PDU
  else if (texteComplet.includes("pdu") || texteComplet.includes("power distribution")) {
    familleTrouvee = FAMILLES.SERVEURS;
    categorieTrouvee = CAT.ACCESSOIRES_CHASSIS;
    confiance += 50;
    modeleNom = "PDU";
  }

  // ============================================
  // DÉTECTION GLOBALE DES MARQUES (Transversal)
  // ============================================
  const MARQUES_CONNUES = ["HP", "HPE", "Dell", "Lenovo", "Apple", "Samsung", "Asus", "Acer", "Toshiba", "Kingston", "Micron", "SanDisk", "Cisco", "TP-Link", "Ubiquiti", "Mikrotik", "Epson", "Brother", "Canon", "Zebra"];
  let marqueTrouvee = null;
  for (const marque of MARQUES_CONNUES) {
    if (texteComplet.includes(marque.toLowerCase())) {
      if (marqueTrouvee && marqueTrouvee !== marque && !(marqueTrouvee==="HP" && marque==="HPE")) {
        // conflit mineur (ex Dell et HP dans la meme ligne)
      } else {
        marqueTrouvee = marque;
      }
    }
  }

  if (marqueTrouvee) {
    attributs["Marque"] = marqueTrouvee;
    confiance += 20;
    raisons.push(`✓ Marque reconnue : ${marqueTrouvee}`);
  }

  // ============================================
  // TRAITEMENT DES POLLUTIONS ET ABERRATIONS
  // ============================================
  if (texteComplet.includes("battery hs") || texteComplet.includes("battery miss") || texteComplet.includes("sans caddy") || texteComplet.includes("cpu hs")) {
    confiance -= 30; // Pénalité car ce n'est pas un modèle pur
    raisons.push("⚠ Donnée polluée par un statut matériel (ex: 'Sans Caddy', 'Battery HS'). À nettoyer !");
    // On extrait l'attribut
    if (texteComplet.includes("battery hs")) attributs["Batterie"] = "HS";
    if (texteComplet.includes("battery miss")) attributs["Batterie"] = "Manquante";
    if (texteComplet.includes("sans caddy")) attributs["Caddy"] = "Non inclus";
  }

  // Cap confiance max à 100
  if (confiance > 100) confiance = 100;
  if (!familleTrouvee) confiance = 0; // Si on a rien trouvé

  // Statut
  let statut: "en_attente" | "conflit" | "valide" | "rejete" = "en_attente";
  if (conflit) {
    confiance = 0;
    statut = "conflit";
  } else if (confiance < 50) {
    raisons.push("⚠ Confiance faible, nécessite une vérification manuelle.");
  } else if (confiance >= 90) {
    raisons.push("★ Classification très probable.");
  }

  // Affinage du nom de modèle cible
  if (categorieTrouvee === CAT.CHARGEURS && modeleNom.endsWith("W")) {
    modeleNom = `${marqueTrouvee || "Générique"} ${modeleNom}`;
  }

  return {
    id: genererHashGroupe(categorieLegacy, referenceLegacy),
    groupe_categorie: categorieLegacy,
    groupe_reference: referenceLegacy,
    cible_famille_nom: familleTrouvee,
    cible_categorie_nom: categorieTrouvee,
    cible_modele_nom: modeleNom.trim(),
    cible_attributs: Object.keys(attributs).length > 0 ? attributs : null,
    statut,
    confiance,
    raisons,
    nb_produits: nbProduits
  };
}
