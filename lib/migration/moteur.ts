import crypto from "crypto";

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
  // ============================================

  // 1. DÉTECTION ORDINATEURS (Laptops, Mini PC, PC Bureau)
  if (texteComplet.includes("laptop") || texteComplet.includes("notebook") || texteComplet.includes("thinkpad") || texteComplet.includes("latitude") || texteComplet.includes("macbook") || texteComplet.includes("vostro") || texteComplet.includes("elitebook") || texteComplet.includes("probook")) {
    familleTrouvee = "ORDINATEURS";
    categorieTrouvee = "PC PORTABLES";
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
    if (matchCPU) attributs["CPU"] = matchCPU[1].toUpperCase();
    const matchRAM = texteComplet.match(/\b(\d+)\s*(gb|go)\b/);
    if (matchRAM) attributs["RAM"] = `${matchRAM[1]}GB`;

    attributs["Details"] = referenceLegacy;
  }
  else if (texteComplet.includes("mini pc") || texteComplet.match(/\b(tiny|micro|ssf|sff)\b/)) {
    familleTrouvee = "ORDINATEURS";
    categorieTrouvee = "PC DE BUREAU";
    confiance += 50;
    modeleNom = "Mini PC";
  }
  else if (texteComplet.includes("pc bureau") || texteComplet.includes("desktop") || texteComplet.includes("station de travail") || texteComplet.includes("all in one")) {
    familleTrouvee = "ORDINATEURS";
    if (texteComplet.includes("station de travail")) categorieTrouvee = "STATIONS DE TRAVAIL & AIO";
    else if (texteComplet.includes("all in one")) categorieTrouvee = "STATIONS DE TRAVAIL & AIO";
    else categorieTrouvee = "PC DE BUREAU";
    confiance += 50;
    modeleNom = "PC de Bureau";
  }
  
  // 2. DÉTECTION SERVEURS
  else if (texteComplet.includes("serveur") || texteComplet.includes("proliant") || texteComplet.includes("poweredge")) {
    familleTrouvee = "SERVEURS";
    confiance += 50;
    if (texteComplet.includes("rack") || texteComplet.includes("dl360") || texteComplet.includes("dl380") || texteComplet.includes("r630") || texteComplet.includes("r440") || texteComplet.includes("r2950")) {
      categorieTrouvee = "SERVEURS RACK";
      modeleNom = "Serveur Rack";
    } else if (texteComplet.includes("tour") || texteComplet.includes("ml350") || texteComplet.includes("t440") || texteComplet.includes("t430")) {
      categorieTrouvee = "SERVEURS TOUR";
      modeleNom = "Serveur Tour";
    } else {
      categorieTrouvee = "À DÉTERMINER";
      modeleNom = "Serveur";
    }
  }

  // 3. DÉTECTION ÉNERGIE (Chargeurs, Adapter, 65W, Alimentations serveur, UPS)
  else if (texteComplet.includes("chargeur") || texteComplet.includes("adapter") || texteComplet.includes("onduleur") || texteComplet.includes("ups ") || texteComplet.includes("alimentation") || (texteComplet.match(/\b(\d+)w\b/) && texteComplet.length < 50 && !texteComplet.includes("serveur"))) {
    if (texteComplet.includes("gigabit") || texteComplet.includes("ethernet") || texteComplet.includes("réseau")) {
      familleTrouvee = "PÉRIPHÉRIQUES & ACCESSOIRES";
      categorieTrouvee = "CÂBLES & ADAPTATEURS";
      modeleNom = "Adaptateur Réseau";
      raisons.push("✓ Type détecté : Adaptateur Réseau");
      confiance += 50;
    } else if (texteComplet.includes("onduleur") || texteComplet.includes("ups") || texteComplet.includes("eaton")) {
      familleTrouvee = "ÉNERGIE & CHARGEURS";
      categorieTrouvee = "ONDULEURS (UPS) & PDU";
      modeleNom = "Onduleur";
      confiance += 50;
    } else if (texteComplet.includes("alimentation serveur") || texteComplet.includes("psu") || (texteComplet.includes("alimentation") && texteComplet.includes("serveur"))) {
      familleTrouvee = "COMPOSANTS INTERNES";
      categorieTrouvee = "ALIMENTATIONS SERVEUR";
      modeleNom = "Alimentation Serveur";
      confiance += 50;
    } else {
      familleTrouvee = "ÉNERGIE & CHARGEURS";
      categorieTrouvee = "CHARGEURS PC";
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
  }

  // 4. DÉTECTION STOCKAGE (SATA, SAS, NVMe, SSD, HDD, NAS)
  else if (texteComplet.match(/\b(ssd|hdd|sas|sata|nvme|nas)\b/)) {
    familleTrouvee = "STOCKAGE";
    confiance += 50;
    
    if (texteComplet.includes("nas") || texteComplet.includes("sauvegarde")) {
      categorieTrouvee = "NAS & SAUVEGARDE";
      raisons.push("✓ Technologie : NAS/SAUVEGARDE");
    } else if (texteComplet.includes("ssd") || texteComplet.includes("nvme")) {
      categorieTrouvee = "SSD";
      raisons.push("✓ Technologie : SSD");
    } else if (texteComplet.includes("hdd") || texteComplet.includes("7.2k") || texteComplet.includes("10k") || texteComplet.includes("15k") || texteComplet.includes("disque sas")) {
      categorieTrouvee = "DISQUES DURS (HDD)";
      raisons.push("✓ Technologie : Disque Dur (HDD)");
    } else {
      // Ambigu
      categorieTrouvee = "À DÉTERMINER";
      confiance -= 20;
      raisons.push("⚠ Impossible de savoir si c'est un HDD ou SSD");
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

  // 5. DÉTECTION RAM
  else if (texteComplet.includes("ram ") || texteComplet.includes("ddr3") || texteComplet.includes("ddr4") || texteComplet.includes("ddr5") || texteComplet.includes("udimm") || texteComplet.includes("rdimm") || texteComplet.includes("ecc ") || (categorieLegacy === "Samsung" && texteComplet.includes("gb")) || (categorieLegacy === "Kingston") || (categorieLegacy === "Micron") || texteComplet.includes("sk hynix")) {
    familleTrouvee = "COMPOSANTS INTERNES";
    categorieTrouvee = "MÉMOIRE RAM";
    confiance += 50;
    raisons.push("✓ Type détecté : Mémoire RAM");

    if (texteComplet.includes("ddr3")) attributs["Type"] = "DDR3";
    if (texteComplet.includes("ddr4")) attributs["Type"] = "DDR4";
    if (texteComplet.includes("ddr5")) attributs["Type"] = "DDR5";
    if (texteComplet.includes("ecc") || texteComplet.includes("registered")) attributs["ECC"] = "Oui";
    
    const matchCapacite = texteComplet.match(/\b(\d+)\s*(gb|go)\b/);
    if (matchCapacite) attributs["Capacité"] = `${matchCapacite[1]}GB`;
    
    modeleNom = `${attributs["Type"] || "RAM"} ${attributs["ECC"] ? "ECC" : "Non-ECC"}`;
  }

  // 6. DÉTECTION PROCESSEURS
  else if (texteComplet.includes("processeur") || texteComplet.includes("intel") || texteComplet.includes("amd ") || (texteComplet.includes(" i3 ") || texteComplet.includes(" i5 ") || texteComplet.includes(" i7 "))) {
    familleTrouvee = "COMPOSANTS INTERNES";
    categorieTrouvee = "PROCESSEURS (CPU)";
    confiance += 50;
    
    if (texteComplet.includes("intel") || texteComplet.includes(" i3") || texteComplet.includes(" i5") || texteComplet.includes(" i7")) {
      modeleNom = "Intel Core";
    } else if (texteComplet.includes("xeon")) {
      modeleNom = "Intel Xeon";
    } else {
      modeleNom = "Processeur";
    }
  }

  // 7. DÉTECTION CARTES GRAPHIQUES
  else if (texteComplet.includes("carte graphique") || texteComplet.includes("radeon") || texteComplet.includes("geforce") || texteComplet.includes("quadro") || texteComplet.includes("rtx ") || texteComplet.includes("gtx ") || texteComplet.includes("rx ")) {
    familleTrouvee = "COMPOSANTS INTERNES";
    categorieTrouvee = "CARTES GRAPHIQUES (GPU)";
    confiance += 50;
    modeleNom = "Carte Graphique";
  }

  // 8. DÉTECTION IMPRIMANTES / CONSOMMABLES
  else if (texteComplet.includes("imprimante") || texteComplet.includes("toner") || texteComplet.includes("ink ") || texteComplet.includes("encre") || texteComplet.includes("cartridge")) {
    familleTrouvee = "IMPRESSION";
    confiance += 50;
    if (texteComplet.includes("toner") || texteComplet.includes("ink") || texteComplet.includes("encre") || texteComplet.includes("cartridge") || texteComplet.includes("consommable")) {
      categorieTrouvee = "CONSOMMABLES";
      modeleNom = "Toner / Encre";
    } else {
      categorieTrouvee = "IMPRIMANTES";
      modeleNom = "Imprimante";
    }
  }

  // 9. DÉTECTION PÉRIPHÉRIQUES (Ecrans, Claviers, Stations, Cables)
  else if (texteComplet.includes("ecran") || texteComplet.includes("monitor") || texteComplet.includes("clavier") || texteComplet.includes("keyboard") || texteComplet.includes("dock") || texteComplet.includes("station d'accueil") || texteComplet.includes("cable") || texteComplet.includes("support")) {
    familleTrouvee = "PÉRIPHÉRIQUES & ACCESSOIRES";
    confiance += 50;
    if (texteComplet.includes("ecran") || texteComplet.includes("monitor")) {
      categorieTrouvee = "ÉCRANS & MONITEURS";
      modeleNom = "Écran";
    } else if (texteComplet.includes("clavier") || texteComplet.includes("keyboard")) {
      categorieTrouvee = "CLAVIERS & SOURIS";
      modeleNom = "Clavier / Souris";
    } else if (texteComplet.includes("dock") || texteComplet.includes("station d'accueil")) {
      categorieTrouvee = "STATIONS D'ACCUEIL (DOCKS)";
      modeleNom = "Station d'accueil";
    } else if (texteComplet.includes("cable")) {
      categorieTrouvee = "CÂBLES & ADAPTATEURS";
      modeleNom = "Câble";
    } else {
      categorieTrouvee = "SUPPORTS DE MONTAGE";
      modeleNom = "Support";
    }
  }

  // 10. DÉTECTION RESEAU
  else if (texteComplet.includes("switch") || texteComplet.includes("cisco") || texteComplet.includes("réseau")) {
    familleTrouvee = "RÉSEAU & POS";
    categorieTrouvee = "SWITCHES";
    confiance += 50;
    modeleNom = "Switch";
  }
  
  // ============================================
  // DÉTECTION GLOBALE DES MARQUES (Transversal)
  // ============================================
  const MARQUES_CONNUES = ["HP", "HPE", "Dell", "Lenovo", "Apple", "Samsung", "Asus", "Acer", "Toshiba", "Kingston", "Micron", "SanDisk", "Cisco"];
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

  // Affinage du nom de modèle cible pour éviter les trop génériques si possible
  // Si on est dans les Chargeurs, on veut "Lenovo 65W" au lieu de juste "65W"
  if (categorieTrouvee === "CHARGEURS PC" && modeleNom.endsWith("W")) {
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
