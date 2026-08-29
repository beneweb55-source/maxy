import fs from "fs";

function parseCSV(content) {
  const lines = content.trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const firstComma = line.indexOf(',');
    const id = parseInt(line.substring(0, firstComma), 10);
    const rest = line.substring(firstComma + 1);
    
    let refStart = rest.indexOf('"');
    let refEnd = -1;
    for (let j = refStart + 1; j < rest.length; j++) {
      if (rest[j] === '"') {
        if (rest[j+1] === '"') j++;
        else { refEnd = j; break; }
      }
    }
    
    let reference = rest.substring(refStart + 1, refEnd).replace(/""/g, '"');
    if (!isNaN(id) && reference) {
      rows.push({ id, reference });
    }
  }
  return rows;
}

function classify(refOriginal) {
  const ref = refOriginal.toLowerCase();
  
  const res = {
    famille: "INCONNU",
    categorie: "INCONNU",
    sousCategorie: null,
    modele: refOriginal.trim(),
    attributs: {},
    confiance: "INSUFFISANT",
    justification: "Pas de règle correspondante"
  };
  
  const has = (...words) => words.some(w => ref.includes(w.toLowerCase()));
  const hasExact = (word) => new RegExp("\\\\b" + word.toLowerCase() + "\\\\b").test(ref);
  const match = (regex) => ref.match(regex);
  const extract = (regex) => { const m = match(regex); return m ? (m[1] || m[0]) : null; };

  // 1. EXTRACTEURS DE BASE
  const extMarque = () => {
    if (has("dell")) return "Dell";
    if (hasExact("hp") || has("hpe ")) return "HP/HPE";
    if (has("lenovo", "thinkpad", "thinkcentre", "thinksystem")) return "Lenovo";
    if (has("apple", "macbook", "imac")) return "Apple";
    if (has("samsung")) return "Samsung";
    if (has("crucial")) return "Crucial";
    if (has("kingston")) return "Kingston";
    if (has("micron")) return "Micron";
    if (has("sk hynix", "hynix")) return "SK Hynix";
    if (has("seagate")) return "Seagate";
    if (has("western digital", "wd blue", "wd red")) return "Western Digital";
    if (has("cisco")) return "Cisco";
    return null;
  };

  const marque = extMarque();

  // --- FILTRES D'EXCLUSION PRIMAIRES (Composants/Accessoires qui usurpent le nom d'un système) ---
  const isCable = has("cable", "câble");
  const isAdapter = hasExact("adapter") || has("adaptateur");
  const isCard = has("carte", "card", "hba", "controller", "contrôleur", "x550", "i350");
  const isAccessory = has("rail", "caddy", "support", "stand", "bracket", "dock", "station d'accueil");
  const isConsumable = has("toner", "cartridge", "ink", "encre", "cf287x", "q7582a");

  // A. CONSOMMABLES
  if (isConsumable) {
    res.famille = "IMPRESSION";
    res.categorie = "CONSOMMABLES";
    res.sousCategorie = has("toner") ? "Toners" : "Cartouches";
    res.confiance = "CERTAIN";
    res.justification = "Mot clé exclusif au consommable détecté (toner, cartridge, etc.)";
    return res;
  }

  // B. ACCESSOIRES ET SUPPORTS
  if (isAccessory && !has("workstation", "station de travail")) { // eviter de flagger une station de travail comme station d'accueil
    if (has("docking", "dock ", "station d'accueil")) {
      res.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
      res.categorie = "STATIONS D'ACCUEIL";
      res.confiance = "CERTAIN";
      res.justification = "Identification forte de station d'accueil/dock";
      return res;
    }
    if (has("stand", "support", "desk mount")) {
      res.famille = "ÉCRANS";
      res.categorie = "SUPPORTS ÉCRANS";
      res.confiance = "CERTAIN";
      res.justification = "Support physique pour écran détecté";
      return res;
    }
    if (has("rail", "caddy")) {
      res.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
      res.categorie = "PIÈCES DE MONTAGE";
      res.sousCategorie = has("rail") ? "Rails Serveur" : "Caddys Disque";
      res.confiance = "CERTAIN";
      res.justification = "Pièce de montage serveur/stockage";
      return res;
    }
  }

  // C. CARTES D'EXTENSION (Réseau, HBA, Contrôleurs) - Doit s'exécuter AVANT Serveurs/Stockage
  if (isCard && !has("graphique", "gpu", "rtx", "gtx", "quadro", "radeon")) {
    res.famille = "COMPOSANTS INTERNES";
    res.categorie = "CARTES D'EXTENSION";
    if (has("hba", "sas", "raid", "controller")) {
      res.sousCategorie = "Contrôleur Stockage (HBA/RAID)";
      res.confiance = "TRES PROBABLE";
      res.justification = "Carte/Contrôleur de stockage identifié";
    } else if (has("ethernet", "network", "réseau", "x550", "i350")) {
      res.sousCategorie = "Carte Réseau (NIC)";
      res.confiance = "TRES PROBABLE";
      res.justification = "Carte réseau identifiée";
    } else {
      res.sousCategorie = "Autre";
      res.confiance = "AMBIGU";
      res.justification = "Carte d'extension générique, type exact non défini";
    }
    return res;
  }

  // D. ADAPTATEURS ET CABLES
  if (isAdapter || isCable) {
    if (has("usb-c to", "usb to", "displayport", "hdmi", "vga")) {
      res.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
      res.categorie = "ADAPTATEURS & CÂBLES";
      res.sousCategorie = "Vidéo / Data";
      res.confiance = "CERTAIN";
      res.justification = "Câble ou adaptateur data/vidéo";
    } else if (has("ethernet", "network", "réseau")) {
      res.famille = "RÉSEAU & POS";
      res.categorie = "ADAPTATEURS RÉSEAU";
      res.confiance = "CERTAIN";
      res.justification = "Adaptateur réseau USB/externe";
    } else if (has("power", "alimentation")) {
      res.famille = "ÉNERGIE & CHARGEURS";
      res.categorie = "CÂBLES D'ALIMENTATION";
      res.confiance = "TRES PROBABLE";
      res.justification = "Câble/Adaptateur d'énergie";
    } else {
      res.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
      res.categorie = "ADAPTATEURS & CÂBLES";
      res.sousCategorie = "Générique";
      res.confiance = "AMBIGU";
      res.justification = "Câble/Adaptateur générique, contexte manquant";
    }
    return res;
  }

  // E. SERVEURS (On sait maintenant que ce n'est ni un rail, ni une carte HBA, ni un câble)
  if (has("poweredge", "proliant", "dl380", "dl360", "r630", "r640", "r730", "r740", "serveur") && !has("ram ", "memory", "ssd", "hdd", "hdd ", "disque")) {
    res.famille = "SERVEURS";
    res.categorie = "SERVEURS RACK";
    res.sousCategorie = marque;
    res.attributs.cpu = extract(/(xeon|epyc)/i);
    res.confiance = "CERTAIN";
    res.justification = "Gamme serveur reconnue (PowerEdge/ProLiant) sans mention de composant isolé";
    return res;
  }

  // F. ORDINATEURS
  if (has("latitude", "thinkpad", "probook", "elitebook", "macbook", "xps") && !has("chargeur", "adapter", "battery", "batterie", "ecran", "screen")) {
    res.famille = "ORDINATEURS";
    res.categorie = "PC PORTABLES";
    res.sousCategorie = marque;
    res.confiance = "CERTAIN";
    res.justification = "Gamme PC Portable reconnue (Latitude, Thinkpad, etc.)";
    return res;
  }
  if (has("precision", "workstation") && !has("micros")) {
    res.famille = "ORDINATEURS";
    res.categorie = "STATIONS DE TRAVAIL";
    res.sousCategorie = marque;
    res.confiance = "CERTAIN";
    res.justification = "Station de travail (Workstation/Precision)";
    return res;
  }
  if (hasExact("micro") || hasExact("mini") || hasExact("tiny") || hasExact("usff")) {
    if (has("optiplex", "thinkcentre", "prodesk", "elitedesk", "hp", "dell", "lenovo")) {
      res.famille = "ORDINATEURS";
      res.categorie = "MINI PC";
      res.sousCategorie = marque;
      res.confiance = "CERTAIN";
      res.justification = "Gamme PC Fixe + format Mini/Micro/Tiny";
      return res;
    }
  }
  if (has("optiplex", "thinkcentre", "prodesk", "elitedesk", "mt", "sff", "tower", "pc bureau")) {
    res.famille = "ORDINATEURS";
    res.categorie = "PC BUREAU";
    res.sousCategorie = marque;
    res.attributs.format = hasExact("sff") ? "SFF" : "Tour";
    res.confiance = "CERTAIN";
    res.justification = "Gamme PC bureau fixe standard";
    return res;
  }

  // G. MEMOIRE RAM
  if (has("ddr3", "ddr4", "ddr5", "pc3", "pc4", "rdimm", "udimm", "lrdimm", "so-dimm", "ecc") && !has("i3", "i5", "i7", "xeon", "ryzen")) {
    res.famille = "COMPOSANTS INTERNES";
    res.categorie = "MÉMOIRE RAM";
    if (has("ecc", "rdimm", "lrdimm")) res.sousCategorie = "Serveur (ECC/RDIMM)";
    else if (has("so-dimm")) res.sousCategorie = "PC Portable (SO-DIMM)";
    else res.sousCategorie = "Standard";
    res.attributs.capacite = extract(/(\d+)\s?(gb|go)/i);
    res.attributs.frequence = extract(/\b\d{4}[a-z]?\b/i);
    res.confiance = "CERTAIN";
    res.justification = "Module mémoire identifié (DDR/ECC/DIMM) sans CPU entier";
    return res;
  }
  if (hasExact("ram") && has("gb", "go") && marque) {
    res.famille = "COMPOSANTS INTERNES";
    res.categorie = "MÉMOIRE RAM";
    res.confiance = "TRES PROBABLE";
    res.justification = "Marque + RAM + Capacité";
    return res;
  }

  // H. STOCKAGE
  const isSAS = hasExact("sas");
  const isSATA = hasExact("sata");
  const isNVMe = hasExact("nvme");
  const isSSD = hasExact("ssd") || isNVMe;
  const isHDD = hasExact("hdd") || has("10k", "15k", "7.2k", "7200", "barracuda", "wd blue", "wd red");

  if ((isSSD || isHDD) && !has("i3", "i5", "i7", "xeon", "ryzen", "server", "serveur", "laptop", "pc")) {
    res.famille = "STOCKAGE";
    if (isSSD) {
      res.categorie = "SSD";
      res.sousCategorie = isNVMe ? "NVMe" : (isSAS ? "SAS" : "SATA / Inconnu");
      res.confiance = "CERTAIN";
      res.justification = "Disque SSD identifié";
    } else {
      res.categorie = "DISQUES DURS";
      res.sousCategorie = isSAS ? "SAS" : "SATA / Inconnu";
      res.confiance = "CERTAIN";
      res.justification = "Disque Dur mécanique identifié";
    }
    res.attributs.capacite = extract(/(\d+)\s?(gb|tb|go|to)/i);
    return res;
  }

  // I. CARTES GRAPHIQUES
  if (has("rtx ", "gtx ", "quadro", "radeon rx", "geforce") && !has("i3", "i5", "i7", "ryzen", "xeon")) {
    res.famille = "COMPOSANTS INTERNES";
    res.categorie = "CARTES GRAPHIQUES";
    res.sousCategorie = has("radeon") ? "AMD" : "Nvidia";
    res.confiance = "CERTAIN";
    res.justification = "Puce graphique isolée (pas de processeur système)";
    return res;
  }

  // J. PROCESSEURS
  if ((hasExact("i3") || hasExact("i5") || hasExact("i7") || hasExact("i9") || has("ryzen", "xeon")) && !has("gb", "go", "ram", "ssd", "hdd", "nvme")) {
    res.famille = "COMPOSANTS INTERNES";
    res.categorie = "PROCESSEURS";
    res.sousCategorie = has("ryzen") ? "AMD" : "Intel";
    res.confiance = "TRES PROBABLE";
    res.justification = "Processeur seul (aucun composant de stockage ou ram mentionné)";
    return res;
  }

  // K. ÉNERGIE & CHARGEURS
  if (match(/\b(45w|65w|90w|130w|135w|150w|180w|230w)\b/i) || has("chargeur", "power supply", "alimentation")) {
    if (has("flex slot", "platinum", "redundant", "serveur", "server")) {
      res.famille = "COMPOSANTS INTERNES";
      res.categorie = "ALIMENTATIONS SERVEUR";
      res.confiance = "CERTAIN";
      res.justification = "Alimentation Serveur (Flex Slot / Serveur)";
    } else {
      res.famille = "ÉNERGIE & CHARGEURS";
      res.categorie = "CHARGEURS PC";
      res.confiance = "TRES PROBABLE";
      res.justification = "Chargeur PC Portable (Wattage typique détecté)";
    }
    return res;
  }

  // L. IMPRIMANTES
  if (has("laserjet", "mfp", "imprimante", "printer", "inkjet")) {
    res.famille = "IMPRESSION";
    res.categorie = "IMPRIMANTES";
    res.sousCategorie = marque;
    res.confiance = "CERTAIN";
    res.justification = "Gamme imprimante détectée";
    return res;
  }

  // M. POS
  if (has("micros", "pos system", "point of sale")) {
    res.famille = "RÉSEAU & POS";
    res.categorie = "SYSTÈMES POS";
    res.confiance = "CERTAIN";
    res.justification = "Système POS / Micros détecté";
    return res;
  }

  // N. PÉRIPHÉRIQUES
  if (has("keyboard", "clavier", "mouse", "souris")) {
    res.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
    res.categorie = "CLAVIERS & SOURIS";
    res.confiance = "CERTAIN";
    res.justification = "Clavier / Souris";
    return res;
  }

  // AMBIGU / AUTRE
  res.confiance = "AMBIGU";
  res.famille = "À VÉRIFIER";
  res.categorie = "À VÉRIFIER";
  res.justification = "Aucune règle sémantique claire ne correspond";
  return res;
}

function main() {
  const csvContent = fs.readFileSync("scratch/snapshot_produits.csv", "utf8");
  const data = parseCSV(csvContent);
  
  const results = data.map(row => ({
    id: row.id,
    ref: row.reference,
    classe: classify(row.reference)
  }));

  let total = results.length;
  let certain = 0;
  let tresProbable = 0;
  let ambigu = 0;
  let insuffisant = 0;

  const familles = new Set();
  const categories = new Set();
  const modeles = new Set();

  results.forEach(r => {
    if (r.classe.confiance === "CERTAIN") certain++;
    else if (r.classe.confiance === "TRES PROBABLE") tresProbable++;
    else if (r.classe.confiance === "AMBIGU") ambigu++;
    else insuffisant++;

    if (r.classe.confiance === "CERTAIN" || r.classe.confiance === "TRES PROBABLE") {
      familles.add(r.classe.famille);
      categories.add(r.classe.categorie);
      modeles.add(r.classe.modele);
    }
  });

  let md = "# CONTRE-AUDIT DRY-RUN (PASS 2 - SEMANTIQUE)\n\n";
  md += "## Statistiques Globales de Confiance\n";
  md += "- **Total Produits** : " + total + "\n";
  md += "- **CERTAIN** (Prêt pour Batch 1) : " + certain + "\n";
  md += "- **TRÈS PROBABLE** (Prêt pour Batch 2) : " + tresProbable + "\n";
  md += "- **AMBIGU / INSUFFISANT** (Revue Humaine) : " + (ambigu + insuffisant) + "\n\n";

  md += "## Structure Générée (Basée sur CERTAIN & TRÈS PROBABLE)\n";
  md += "- Familles uniques : " + familles.size + "\n";
  md += "- Catégories uniques : " + categories.size + "\n";
  md += "- Modèles identifiés : " + modeles.size + "\n\n";

  // Grouper par Famille > Categorie pour afficher le détail
  const tree = {};
  for (const r of results) {
    const f = r.classe.famille;
    const c = r.classe.categorie;
    if (!tree[f]) tree[f] = {};
    if (!tree[f][c]) tree[f][c] = [];
    tree[f][c].push(r);
  }

  // Aggréger les produits identiques au sein d'une catégorie pour éviter d'imprimer 1600 lignes identiques
  for (const f of Object.keys(tree).sort()) {
    md += "### Famille : " + f + "\n";
    for (const c of Object.keys(tree[f]).sort()) {
      md += "#### Catégorie : " + c + "\n";
      md += "| Modèle Exact | Exemple de Réf Originale | Nb | Confiance | Justification |\n";
      md += "|---|---|---|---|---|\n";
      
      const refGroups = {};
      tree[f][c].forEach(r => {
        if (!refGroups[r.ref]) refGroups[r.ref] = { count: 0, item: r };
        refGroups[r.ref].count++;
      });
      
      const sorted = Object.values(refGroups).sort((a,b) => b.count - a.count);
      for (const grp of sorted) {
        const item = grp.item;
        const color = item.classe.confiance === "CERTAIN" ? "🟢" : (item.classe.confiance === "TRES PROBABLE" ? "🟡" : "🔴");
        md += "| " + item.classe.modele + " | " + item.ref + " | " + grp.count + " | " + color + " " + item.classe.confiance + " | " + item.classe.justification + " |\n";
      }
      md += "\n";
    }
  }

  fs.writeFileSync("scratch/dry_run_v2.md", md);
  fs.writeFileSync("scratch/dry_run_v2.json", JSON.stringify(results, null, 2));
  console.log("Rapport V2 généré dans scratch/dry_run_v2.md");
}

main();
