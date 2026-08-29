import fs from "fs";

// 1. Parsing CSV Helper
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

// 2. Classification Engine
function classify(refOriginal) {
  const ref = refOriginal.toLowerCase();
  
  const result = {
    famille: "INCONNU",
    categorie: "INCONNU",
    sousCategorie: null,
    modele: "À DÉFINIR",
    attributs: {},
    ambigu: false,
    justification: ""
  };
  
  // Helpers
  const has = (...words) => words.some(w => ref.includes(w));
  const hasAll = (...words) => words.every(w => ref.includes(w));
  const match = (regex) => ref.match(regex);
  const extract = (regex) => { const m = match(regex); return m ? m[1] || m[0] : null; };
  
  // Extractor functions
  const extMarque = () => {
    if (has("dell")) return "Dell";
    if (has("hp ", "hpe ")) return "HP";
    if (has("lenovo", "thinkpad", "thinkcentre")) return "Lenovo";
    if (has("apple", "macbook", "imac")) return "Apple";
    if (has("samsung")) return "Samsung";
    if (has("crucial")) return "Crucial";
    if (has("kingston")) return "Kingston";
    if (has("cisco")) return "Cisco";
    return null;
  };

  const extCPU = () => extract(/(i3|i5|i7|i9|ryzen\s?\d|xeon|pentium|celeron)[-\s]?([a-z0-9]+)?/i);
  const extRAM = () => extract(/(\d+)\s?(gb|go|tb|to)(?:\s?(ddr\d|ecc|rdimm))?/i);
  const extStockage = () => extract(/(\d+)\s?(gb|go|tb|to)\s?(ssd|hdd|nvme|sas|sata)/i);

  // --- REGLES DE CLASSIFICATION METIER ---

  // 1. SERVEURS
  if (has("poweredge", "proliant", "dl380", "r630", "r640", "r730", "r740", "serveur")) {
    result.famille = "SERVEURS";
    result.categorie = "SERVEURS RACK";
    result.sousCategorie = extMarque();
    result.modele = refOriginal.replace(/(i\d|xeon|ryzen|(\d+)\s?gb|(\d+)\s?tb).*/gi, "").trim() || "Serveur Rack";
    if (result.modele.length > 50) result.modele = result.modele.substring(0, 50).trim();
    result.attributs = { cpu: extCPU(), ram: extRAM(), stockage: extStockage() };
    result.justification = "Présence de mot clé serveur rack (PowerEdge, Proliant, etc.)";
  }
  // 2. PC PORTABLES
  else if (has("latitude", "thinkpad", "probook", "elitebook", "macbook", "xps", "laptop")) {
    result.famille = "ORDINATEURS";
    result.categorie = "PC PORTABLES";
    result.sousCategorie = extMarque();
    // Isolate model name: e.g. "Dell Latitude 7280" from "Dell Latitude 7280 i7..."
    const parts = refOriginal.split(/(i3|i5|i7|i9|ryzen|amd|core)/i);
    result.modele = parts[0].trim();
    result.attributs = { cpu: extCPU(), ram: extRAM(), stockage: extStockage() };
    result.justification = "Gamme PC Portable détectée (Latitude, Thinkpad, etc.)";
  }
  // 3. MINI PC / TINY
  else if (has("mini", "tiny", "micro", "usff") && has("optiplex", "thinkcentre", "prodesk", "elitedesk", "hp", "dell", "lenovo")) {
    result.famille = "ORDINATEURS";
    result.categorie = "MINI PC";
    result.sousCategorie = extMarque();
    const parts = refOriginal.split(/(i3|i5|i7|i9|ryzen|amd|core)/i);
    result.modele = parts[0].trim();
    result.attributs = { cpu: extCPU(), ram: extRAM(), stockage: extStockage() };
    result.justification = "Présence de mots clés PC fixe + format mini/tiny/micro";
  }
  // 4. PC BUREAU (FIXE STANDARD)
  else if (has("optiplex", "thinkcentre", "prodesk", "elitedesk", "mt", "sff", "tower", "pc bureau")) {
    result.famille = "ORDINATEURS";
    result.categorie = "PC BUREAU";
    result.sousCategorie = extMarque();
    const parts = refOriginal.split(/(i3|i5|i7|i9|ryzen|amd|core)/i);
    result.modele = parts[0].trim();
    result.attributs = { cpu: extCPU(), ram: extRAM(), format: has("sff") ? "SFF" : "Tour" };
    result.justification = "Gamme PC bureau fixe détectée";
  }
  // 5. MEMOIRE RAM (COMPOSANTS) - doit ne pas être un PC (exclu par les if précédents et sans CPU)
  else if (has("ddr3", "ddr4", "ddr5", "pc3", "pc4", "rdimm") && !has("i3", "i5", "i7", "xeon", "optiplex", "latitude")) {
    result.famille = "COMPOSANTS INTERNES";
    result.categorie = "MÉMOIRE RAM";
    result.sousCategorie = has("ecc", "rdimm") ? "Serveur (ECC/RDIMM)" : "Standard";
    result.modele = refOriginal.trim();
    result.attributs = { type: extract(/ddr\d|pc\d/i), capacite: extRAM() };
    result.justification = "Mots clés RAM (DDRx, PCx) sans processeur associé";
  }
  // 6. STOCKAGE DISQUES SAS
  else if (has("sas") && (has("10k", "15k", "7.2k", "hdd", "caddy") || has("300gb", "600gb", "900gb", "1tb", "1.2tb"))) {
    result.famille = "STOCKAGE";
    result.categorie = "DISQUES DURS";
    result.sousCategorie = "SAS";
    result.modele = refOriginal.trim();
    result.attributs = { rpm: extract(/10k|15k|7\.2k/i), capacite: extStockage() || extract(/\d+\s?(gb|tb)/i) };
    result.justification = "Disque dur SAS détecté";
  }
  // 7. STOCKAGE SSD
  else if (has("ssd", "nvme") && !has("i3", "i5", "i7", "xeon")) {
    result.famille = "STOCKAGE";
    result.categorie = "SSD";
    result.sousCategorie = has("nvme") ? "NVMe" : (has("sas") ? "SAS" : "SATA");
    result.modele = refOriginal.trim();
    result.attributs = { capacite: extStockage() || extract(/\d+\s?(gb|tb)/i) };
    result.justification = "Mot clé SSD/NVMe sans processeur associé";
  }
  // 8. CARTES GRAPHIQUES
  else if (has("rtx", "gtx", "quadro", "rx ", "radeon") && !has("i3", "i5", "i7")) {
    result.famille = "COMPOSANTS INTERNES";
    result.categorie = "CARTES GRAPHIQUES";
    result.sousCategorie = has("rtx", "gtx", "quadro") ? "Nvidia" : "AMD";
    result.modele = refOriginal.trim();
    result.justification = "Nom de GPU détecté";
  }
  // 9. PROCESSEURS
  else if ((has(" i3", " i5", " i7", " i9", "ryzen", "xeon") || match(/^i\d\s?-/)) && !has("gb", "go", "ram", "ssd")) {
    result.famille = "COMPOSANTS INTERNES";
    result.categorie = "PROCESSEURS";
    result.sousCategorie = has("ryzen", "amd") ? "AMD" : "Intel";
    result.modele = refOriginal.trim();
    result.justification = "Nom de CPU seul sans RAM/SSD mentionné";
  }
  // 10. ALIMENTATIONS SERVEUR
  else if (has("flex slot", "platinum", "alimentation") && (has("500w", "800w", "460w") || has("hpe", "hp", "dell"))) {
    result.famille = "COMPOSANTS INTERNES";
    result.categorie = "ALIMENTATIONS SERVEUR";
    result.sousCategorie = extMarque();
    result.modele = refOriginal.trim();
    result.attributs = { puissance: extract(/(\d+w)/i) };
    result.justification = "Mots clés alimentation serveur (Flex slot, Platinum, etc.)";
  }
  // 11. CHARGEURS PC
  else if (match(/\b(45w|65w|90w|130w|135w|150w|180w|230w)\b/i) || has("chargeur", "power adapter") && !has("usb-c to c")) {
    result.famille = "ÉNERGIE & CHARGEURS";
    result.categorie = "CHARGEURS PC";
    result.sousCategorie = extMarque();
    result.modele = refOriginal.trim();
    result.attributs = { puissance: extract(/(\d+w)/i), type: has("type c", "usb-c") ? "USB-C" : "Standard" };
    result.justification = "Puissance PC (65w, 90w...) détectée";
  }
  // 12. HDD SUPPLÉMENTAIRES (Seagate, WD)
  else if (has("seagate", "wd blue", "wd red", "western digital", "barracuda", "desktop hdd") || (has("hdd") && has("gb", "tb"))) {
    result.famille = "STOCKAGE";
    result.categorie = "DISQUES DURS";
    result.sousCategorie = has("sas") ? "SAS" : "SATA";
    result.modele = refOriginal.trim();
    result.attributs = { capacite: extStockage() || extract(/\d+\s?(gb|tb|to)/i) };
    result.justification = "Marque ou modèle HDD classique détecté";
  }
  // 13. RAM SUPPLÉMENTAIRES (ex: 16GB Micron (2933))
  else if (has("micron", "sk hynix", "samsung", "kingston", "ram") && match(/\d{4}[v|t|u|e|r]?\b/i) && has("gb", "go")) {
    result.famille = "COMPOSANTS INTERNES";
    result.categorie = "MÉMOIRE RAM";
    result.sousCategorie = "Standard";
    result.modele = refOriginal.trim();
    result.attributs = { frequence: extract(/\d{4}/), capacite: extRAM() || extract(/\d+\s?(gb|go)/i) };
    result.justification = "Format '16GB Marque (Fréquence)' détecté";
  }
  // 14. IMPRIMANTES
  else if (has("laserjet", "mfp", "imprimante", "printer")) {
    result.famille = "IMPRESSION";
    result.categorie = "IMPRIMANTES";
    result.sousCategorie = extMarque();
    result.modele = refOriginal.trim();
    result.justification = "Mot clé imprimante détecté";
  }
  // 15. TONERS & CONSOMMABLES
  else if (has("toner", "cartridge")) {
    result.famille = "IMPRESSION";
    result.categorie = "CONSOMMABLES";
    result.sousCategorie = extMarque();
    result.modele = refOriginal.trim();
    result.justification = "Mot clé toner ou cartouche détecté";
  }
  // 16. STATIONS D'ACCUEIL (DOCKS)
  else if (has("docking", "dock ", "dock station")) {
    result.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
    result.categorie = "STATIONS D'ACCUEIL";
    result.sousCategorie = extMarque();
    result.modele = refOriginal.trim();
    result.justification = "Mot clé dock détecté";
  }
  // 17. ADAPTATEURS ET CÂBLES
  else if (has("adaptateur", "adapter", "usb-c to", "cable")) {
    result.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
    result.categorie = "ADAPTATEURS & CÂBLES";
    result.modele = refOriginal.trim();
    result.justification = "Mot clé câble ou adaptateur détecté";
  }
  // 18. STATIONS DE TRAVAIL
  else if (has("precision", "workstation") && !has("micros")) {
    result.famille = "ORDINATEURS";
    result.categorie = "STATIONS DE TRAVAIL";
    result.sousCategorie = extMarque();
    const parts = refOriginal.split(/(i3|i5|i7|i9|ryzen|amd|core|xeon|rtx)/i);
    result.modele = parts[0].trim();
    result.justification = "Mot clé Precision / Workstation détecté";
  }
  // 19. POINT DE VENTE (POS)
  else if (has("micros", "pos system")) {
    result.famille = "RÉSEAU & POS";
    result.categorie = "SYSTÈMES POS";
    result.modele = refOriginal.trim();
    result.justification = "Mot clé POS ou Micros détecté";
  }
  // 20. CLAVIERS & SOURIS
  else if (has("keyboard", "clavier", "mouse", "souris")) {
    result.famille = "PÉRIPHÉRIQUES & ACCESSOIRES";
    result.categorie = "CLAVIERS & SOURIS";
    result.sousCategorie = extMarque();
    result.modele = refOriginal.trim();
    result.justification = "Mot clé clavier/souris détecté";
  }
  // 21. SUPPORTS ÉCRANS
  else if (has("stand", "support", "desk mount")) {
    result.famille = "ÉCRANS";
    result.categorie = "SUPPORTS ÉCRANS";
    result.modele = refOriginal.trim();
    result.justification = "Mot clé support ou stand détecté";
  }
  // 22. SSD SUPPLEMENTAIRES (SAMSUNG 960gb)
  else if (has("gb", "tb") && has("samsung", "crucial", "kingston") && !has("i3", "i5", "i7", "ddr", "ram", "server")) {
    result.famille = "STOCKAGE";
    result.categorie = "SSD";
    result.sousCategorie = "Standard";
    result.modele = refOriginal.trim();
    result.attributs = { capacite: extStockage() || extract(/\d+\s?(gb|tb|to)/i) };
    result.justification = "Marque SSD + capacité détectée (rattrapage)";
  }
  // AMBIGU / AUTRE
  else {
    result.ambigu = true;
    result.famille = "À VÉRIFIER";
    result.categorie = "À VÉRIFIER";
    result.modele = refOriginal.trim();
    result.justification = "Pas de règles métier correspondantes";
  }

  // Nettoyage modèle
  if (result.modele) {
    result.modele = result.modele.replace(/-$/, "").replace(/,$/, "").trim();
  }

  return result;
}

// 3. Main script
function main() {
  const csvContent = fs.readFileSync("scratch/snapshot_produits.csv", "utf8");
  const data = parseCSV(csvContent);
  
  const map = new Map();
  // Grouper par référence pour simplifier l'audit
  for (const row of data) {
    if (!map.has(row.reference)) {
      map.set(row.reference, { 
        count: 0, 
        ref: row.reference, 
        classe: classify(row.reference) 
      });
    }
    map.get(row.reference).count++;
  }

  const groupes = Array.from(map.values());
  
  // Stats
  let totalProduits = data.length;
  const familles = new Set();
  const categories = new Set();
  const sousCategories = new Set();
  const modeles = new Set();
  let ambigus = 0;

  groupes.forEach(g => {
    if (g.classe.ambigu) ambigus += g.count;
    else {
      familles.add(g.classe.famille);
      categories.add(g.classe.categorie);
      if (g.classe.sousCategorie) sousCategories.add(g.classe.sousCategorie);
      modeles.add(g.classe.modele);
    }
  });

  // Construction du rapport
  let md = "# RAPPORT DRY-RUN : NOUVELLE CLASSIFICATION DÉFINITIVE\n\n";
  md += "## Statistiques Globales\n";
  md += "- Nombre total de produits : " + totalProduits + "\n";
  md += "- Nombre de familles proposées : " + familles.size + "\n";
  md += "- Nombre de catégories : " + categories.size + "\n";
  md += "- Nombre de sous-catégories : " + sousCategories.size + "\n";
  md += "- Nombre de modèles : " + modeles.size + "\n";
  md += "- Nombre de produits ambigus (À VÉRIFIER) : " + ambigus + "\n\n";

  md += "## Classification Proposée par Famille\n\n";

  // Grouper par Famille > Categorie pour l'affichage
  const tree = {};
  for (const g of groupes) {
    const f = g.classe.famille;
    const c = g.classe.categorie;
    if (!tree[f]) tree[f] = {};
    if (!tree[f][c]) tree[f][c] = [];
    tree[f][c].push(g);
  }

  for (const famille of Object.keys(tree).sort()) {
    md += "### Famille : " + famille + "\n";
    for (const cat of Object.keys(tree[famille]).sort()) {
      md += "#### Catégorie : " + cat + "\n\n";
      md += "| Modèle Cible | Produit Réel | Exemplaires | Sous-cat | Attributs Détectés | Raison |\n";
      md += "|---|---|---|---|---|---|\n";
      
      const items = tree[famille][cat].sort((a,b) => b.count - a.count);
      for (const item of items) {
        md += "| **" + item.classe.modele + "** | " + item.ref + " | " + item.count + " | " + (item.classe.sousCategorie || '-') + " | " + JSON.stringify(item.classe.attributs) + " | " + item.classe.justification + " |\n";
      }
      md += "\n";
    }
  }

  fs.writeFileSync("scratch/dry_run_classification.md", md);
  console.log("Rapport généré dans scratch/dry_run_classification.md");
}

main();
