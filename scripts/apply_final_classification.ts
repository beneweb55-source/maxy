import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();

const TREE = [
  {
    nom: "ORDINATEURS",
    categories: [
      { nom: "PC Portables", sousCategories: ["Laptops & Ultrabooks"] },
      { nom: "PC Fixes & Tout-en-un", sousCategories: ["Mini PC & Clients Légers", "Stations de Travail & PC Gaming", "Tours & Formats SFF", "Tout-en-un (All-in-One)"] },
      { nom: "Matériel Point de Vente (POS)", sousCategories: ["Terminaux & Caisses Tactiles (TPV)"] }
    ]
  },
  {
    nom: "SERVEURS & INFRASTRUCTURE",
    categories: [
      { nom: "Serveurs", sousCategories: ["Serveurs Tour", "Serveurs Rack (1U / 2U / 4U)"] },
      { nom: "Accessoires Châssis & Baies", sousCategories: ["Caddies, Tiroirs & Câblage Serveur", "Rails, PDU & Gestion des Câbles"] }
    ]
  },
  {
    nom: "STOCKAGE",
    categories: [
      { nom: "Disques Durs Mécaniques (HDD)", sousCategories: ["Disques Durs SAS 2,5\" (10K / 15K RPM)", "Disques Durs SAS 3,5\" (7.2K / 15K RPM)", "Disques Durs SATA 3,5\" (Bureautique / NAS)", "Disques Durs SATA 2,5\""] },
      { nom: "Disques Flash (SSD)", sousCategories: ["Disques SSD 2,5\" SATA", "Disques SSD M.2 NVMe & PCIe", "Disques SSD Entreprise (SAS / U.2 PCIe)"] },
      { nom: "Stockage Réseau & Baies (NAS / DAS)", sousCategories: ["Serveurs NAS, DAS & Sauvegarde"] }
    ]
  },
  {
    nom: "MÉMOIRE & PROCESSEURS",
    categories: [
      { nom: "Processeurs (CPU)", sousCategories: ["Processeurs PC (Intel Core / AMD Ryzen)", "Processeurs Serveur (Intel Xeon / AMD EPYC)"] },
      { nom: "Mémoire Vive (RAM)", sousCategories: ["RAM PC Fixe (UDIMM / Non-ECC)", "RAM Serveur (ECC Registered / RDIMM)", "RAM PC Portable (SO-DIMM)"] }
    ]
  },
  {
    nom: "COMPOSANTS & CARTES D'EXTENSION",
    categories: [
      { nom: "Cartes Graphiques (GPU)", sousCategories: ["Cartes Graphiques Grand Public (GeForce / Radeon)", "Cartes Graphiques Professionnelles (Quadro / RTX Pro)"] },
      { nom: "Refroidissement & Châssis", sousCategories: ["Dissipateurs Thermiques & Ventilateurs Serveur"] },
      { nom: "Contrôleurs de Stockage", sousCategories: ["Contrôleurs RAID & Cartes HBA"] },
      { nom: "Cartes d'Extension Internes", sousCategories: ["Cartes Réseau Internes (PCIe / FlexibleLOM)", "Risers, Adaptateurs PCIe & Cartes d'Acquisition"] }
    ]
  },
  {
    nom: "PÉRIPHÉRIQUES & CONNECTIQUE",
    categories: [
      { nom: "Câbles & Connectique", sousCategories: ["Câbles USB, Vidéo & Alimentation"] },
      { nom: "Adaptateurs & Convertisseurs", sousCategories: ["Adaptateurs Réseau USB & Convertisseurs"] },
      { nom: "Accessoires Moniteurs", sousCategories: ["Supports & Bras Articulés pour Écrans"] },
      { nom: "Stations d'Accueil & Hubs", sousCategories: ["Docks USB-C, Thunderbolt & Stations d'Accueil"] },
      { nom: "Périphériques de Saisie", sousCategories: ["Claviers, Souris & Combos"] },
      { nom: "Moniteurs & Affichage", sousCategories: ["Écrans & Moniteurs Bureautique / Pro"] },
      { nom: "Audio & Vidéo Professionnelle", sousCategories: ["Systèmes de Visioconférence & Caméras"] }
    ]
  },
  {
    nom: "ÉLECTRICITÉ & ALIMENTATION",
    categories: [
      { nom: "Chargeurs & Alimentation Externe", sousCategories: ["Chargeurs Embout Propriétaire (Jack / Slim Tip)", "Chargeurs USB-C (Type-C)"] },
      { nom: "Alimentations Internes", sousCategories: ["Alimentations Serveur (Redondantes / Hot-Plug)"] },
      { nom: "Protection Électrique & Onduleurs", sousCategories: ["Onduleurs (UPS) Tour & Rack", "Modules Batterie & Accessoires UPS"] }
    ]
  },
  {
    nom: "IMPRESSION & CONSOMMABLES",
    categories: [
      { nom: "Imprimantes & Scanners", sousCategories: ["Imprimantes Laser & Multifonctions", "Imprimantes Étiquettes & Code-barres"] },
      { nom: "Consommables d'Impression", sousCategories: ["Cartouches d'Encre", "Toners & Tambours Laser"] }
    ]
  },
  {
    nom: "RÉSEAU ACTIF & COMMUTATION",
    categories: [
      { nom: "Commutateurs & Routage", sousCategories: ["Switches Réseau (Manageables / PoE)"] }
    ]
  },
  {
    nom: "DIVERS",
    categories: [
      { nom: "Non Classé", sousCategories: ["À Classifier"] }
    ]
  }
];

const MAPPING_LEGACY: Record<string, { famille: string, categorie: string, sousCategorie?: string }> = {
  // ORDINATEURS
  "Ordinateurs PC": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tours & Formats SFF" },
  "PC BUREAU": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tours & Formats SFF" },
  "PC BUREAU SSF": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tours & Formats SFF" },
  "Ordinateurs Pc Gamer": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Stations de Travail & PC Gaming" },
  "Mini pc": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Mini PC & Clients Légers" },
  "ORDINATEURS DE BUREAU (MINI PC)": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Mini PC & Clients Légers" },
  "PC ALL IN ONE": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tout-en-un (All-in-One)" },
  "All in One": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tout-en-un (All-in-One)" },
  "Station de travail": { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Stations de Travail & PC Gaming" },
  "Matériel POS": { famille: "ORDINATEURS", categorie: "Matériel Point de Vente (POS)", sousCategorie: "Terminaux & Caisses Tactiles (TPV)" },
  "Matériel Point de Vente (POS)": { famille: "ORDINATEURS", categorie: "Matériel Point de Vente (POS)", sousCategorie: "Terminaux & Caisses Tactiles (TPV)" },
  "PC PORTABLE": { famille: "ORDINATEURS", categorie: "PC Portables", sousCategorie: "Laptops & Ultrabooks" },
  "laptop": { famille: "ORDINATEURS", categorie: "PC Portables", sousCategorie: "Laptops & Ultrabooks" },

  // SERVEURS
  "SERVEURS": { famille: "SERVEURS & INFRASTRUCTURE", categorie: "Serveurs", sousCategorie: "Serveurs Rack (1U / 2U / 4U)" },
  "serveurs rack": { famille: "SERVEURS & INFRASTRUCTURE", categorie: "Serveurs", sousCategorie: "Serveurs Rack (1U / 2U / 4U)" },
  "SERVEUR TOUR": { famille: "SERVEURS & INFRASTRUCTURE", categorie: "Serveurs", sousCategorie: "Serveurs Tour" },
  "serveurs Tour": { famille: "SERVEURS & INFRASTRUCTURE", categorie: "Serveurs", sousCategorie: "Serveurs Tour" },

  // STOCKAGE
  "SATA HDD": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SATA 3,5\" (Bureautique / NAS)" },
  "SATA": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SATA 3,5\" (Bureautique / NAS)" },
  "SATA- 3,5\" HDD": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SATA 3,5\" (Bureautique / NAS)" },
  "SAS 600GB/900GB HDD": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS - 2,5\" - 600GB / 900GB HDD": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS - 2,5\" - 300GB / 146GB": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS- 2,5\" - 1TB / 1,2TB HDD": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS - 2,5\" - 450GB HDD": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "Stockage-Disque SAS": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 1.2TB": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 1.8TB/2.4TB": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 300GB": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 4TB": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 8TB/10TB/12TB": { famille: "STOCKAGE", categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SATA SSD": { famille: "STOCKAGE", categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD 2,5\" SATA" },
  "SAS / NVMe SSD": { famille: "STOCKAGE", categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD Entreprise (SAS / U.2 PCIe)" },
  "SAS / NVMe - 2,5\" SSD": { famille: "STOCKAGE", categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD Entreprise (SAS / U.2 PCIe)" },
  "NVMe": { famille: "STOCKAGE", categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD M.2 NVMe & PCIe" },
  "NAS / DAS": { famille: "STOCKAGE", categorie: "Stockage Réseau & Baies (NAS / DAS)", sousCategorie: "Serveurs NAS, DAS & Sauvegarde" },
  "NAS, DAS & SAUVEGARDE": { famille: "STOCKAGE", categorie: "Stockage Réseau & Baies (NAS / DAS)", sousCategorie: "Serveurs NAS, DAS & Sauvegarde" },

  // MÉMOIRE & PROCESSEURS
  "MÉMOIRE": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "RAM ECC": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "Samsung": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "Kingston": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "SK hynix": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "PNY Technologies Europe": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM PC Fixe (UDIMM / Non-ECC)" },
  "Micron": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },

  // MÉMOIRE & PROCESSEURS (CPU)
  "INTEL": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Processeurs (CPU)" },
  "Processeurs (CPU)": { famille: "MÉMOIRE & PROCESSEURS", categorie: "Processeurs (CPU)" },
  "CARTES GRAPHIQUES": { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Cartes Graphiques (GPU)", sousCategorie: "Cartes Graphiques Grand Public (GeForce / Radeon)" },
  "CARTE GRAPHIQUE": { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Cartes Graphiques (GPU)", sousCategorie: "Cartes Graphiques Grand Public (GeForce / Radeon)" },
  "CARTES D'ACQUISITION ET RISERS": { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Cartes d'Extension Internes", sousCategorie: "Risers, Adaptateurs PCIe & Cartes d'Acquisition" },
  "CARTES D'ACQUISITION ET CARTES D'EXTENSION": { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Cartes d'Extension Internes", sousCategorie: "Risers, Adaptateurs PCIe & Cartes d'Acquisition" },
  "ADAPTATEURS": { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Cartes d'Extension Internes", sousCategorie: "Risers, Adaptateurs PCIe & Cartes d'Acquisition" },
  "COMPOSANTS": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "HPE / HP(ALIMENTATIONS SERVEUR)": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "DELL (ALIMENTATIONS SERVEUR)": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "IBM / LENOVO (ALIMENTATIONS SERVEUR)": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "REFROIDISSEMENT SERVEUR": { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Refroidissement & Châssis", sousCategorie: "Dissipateurs Thermiques & Ventilateurs Serveur" },
  "Cartes raid": { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Contrôleurs de Stockage", sousCategorie: "Contrôleurs RAID & Cartes HBA" },

  // PÉRIPHÉRIQUES & CONNECTIQUE
  "Écrans": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Moniteurs & Affichage", sousCategorie: "Écrans & Moniteurs Bureautique / Pro" },
  "ecran": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Moniteurs & Affichage", sousCategorie: "Écrans & Moniteurs Bureautique / Pro" },
  "CLAVIERS & PÉRIPHÉRIQUES": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Périphériques de Saisie", sousCategorie: "Claviers, Souris & Combos" },
  "CLAVIERS ET PÉRIPHÉRIQUES": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Périphériques de Saisie", sousCategorie: "Claviers, Souris & Combos" },
  "Station d'accueil": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Stations d'Accueil & Hubs", sousCategorie: "Docks USB-C, Thunderbolt & Stations d'Accueil" },
  "Support ecran": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Accessoires Moniteurs", sousCategorie: "Supports & Bras Articulés pour Écrans" },
  "ACCESSOIRES ET ÉQUIPEMENTS DE MONTAGE": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Adaptateurs & Convertisseurs", sousCategorie: "Adaptateurs Réseau USB & Convertisseurs" },
  "ÉQUIPEMENTS DE VIDÉOCONFÉRENCE": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Audio & Vidéo Professionnelle", sousCategorie: "Systèmes de Visioconférence & Caméras" },

  // ÉLECTRICITÉ & ALIMENTATION
  "Adapter": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur LENOVO": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur DELL": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur HP": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Câbles USB, Vidéo, Réseau": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Câbles & Connectique", sousCategorie: "Câbles USB, Vidéo & Alimentation" },
  "Cable": { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Câbles & Connectique", sousCategorie: "Câbles USB, Vidéo & Alimentation" },
  "ONDULEURS": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Protection Électrique & Onduleurs", sousCategorie: "Onduleurs (UPS) Tour & Rack" },
  "ONDULEURS ET PROTECTION ÉLECTRIQUE (UPS)": { famille: "ÉLECTRICITÉ & ALIMENTATION", categorie: "Protection Électrique & Onduleurs", sousCategorie: "Onduleurs (UPS) Tour & Rack" },

  // IMPRESSION & CONSOMMABLES
  "Imprimante": { famille: "IMPRESSION & CONSOMMABLES", categorie: "Imprimantes & Scanners", sousCategorie: "Imprimantes Laser & Multifonctions" },
  "Consommables & Cartouches": { famille: "IMPRESSION & CONSOMMABLES", categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "HP - TONERS(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION & CONSOMMABLES", categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "AUTRES COMPATIBLES(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION & CONSOMMABLES", categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "CANON / KYOCERA(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION & CONSOMMABLES", categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "EPSON - ENCRES(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION & CONSOMMABLES", categorie: "Consommables d'Impression", sousCategorie: "Cartouches d'Encre" },

  // RÉSEAU ACTIF & COMMUTATION
  "Réseau & POS": { famille: "RÉSEAU ACTIF & COMMUTATION", categorie: "Commutateurs & Routage", sousCategorie: "Switches Réseau (Manageables / PoE)" },
  "RESEAU-SWITCHES": { famille: "RÉSEAU ACTIF & COMMUTATION", categorie: "Commutateurs & Routage", sousCategorie: "Switches Réseau (Manageables / PoE)" },
  "PDU & ACCESSOIRES RACK": { famille: "SERVEURS & INFRASTRUCTURE", categorie: "Accessoires Châssis & Baies", sousCategorie: "Rails, PDU & Gestion des Câbles" },
};

async function main() {
  console.log("Starting Reclassification Execution...");

  // 1. Create Tree
  const nodeIds = new Map();

  for (let i = 0; i < TREE.length; i++) {
    const fam = TREE[i];
    let famNode = await prisma.categorie.findFirst({ where: { nom: fam.nom, parent_id: null } });
    if (!famNode) {
      famNode = await prisma.categorie.create({ data: { nom: fam.nom, ordre: i } });
    }
    nodeIds.set(fam.nom, famNode.id);

    for (let j = 0; j < fam.categories.length; j++) {
      const cat = fam.categories[j];
      const catName = typeof cat === 'string' ? cat : cat.nom;
      let catNode = await prisma.categorie.findFirst({ where: { nom: catName, parent_id: famNode.id } });
      if (!catNode) {
        catNode = await prisma.categorie.create({ data: { nom: catName, parent_id: famNode.id, ordre: j } });
      }
      nodeIds.set(`${fam.nom}_${catName}`, catNode.id);

      if (typeof cat === 'object' && cat.sousCategories) {
        for (let k = 0; k < cat.sousCategories.length; k++) {
          const scat = cat.sousCategories[k];
          let scatNode = await prisma.categorie.findFirst({ where: { nom: scat, parent_id: catNode.id } });
          if (!scatNode) {
            scatNode = await prisma.categorie.create({ data: { nom: scat, parent_id: catNode.id, ordre: k } });
          }
          nodeIds.set(`${fam.nom}_${catName}_${scat}`, scatNode.id);
        }
      }
    }
  }

  console.log("Tree created.");

  const produits = await prisma.produit.findMany();
  let updated = 0;
  let ambiguous = 0;

  for (const p of produits) {
    const rawCat = p.categorie ? p.categorie.trim().replace(/\u200B/g, '').replace(/—/g, '-') : null;
    let target = null;
    
    // EXCEPTIONS EXACTES
    if (p.reference.includes("4GB DDR4 UDIMM") || p.reference.includes("16GB DDR4 2933 UDIMM") || p.reference.includes("SK Hynix 4GB")) {
      target = MAPPING_LEGACY["PNY Technologies Europe"]; // desktop
    } else if (p.reference.includes("ECC") || p.reference.includes("RDIMM")) {
      target = MAPPING_LEGACY["Kingston"]; // serveur
    } else if (p.reference.includes("Dock") || p.reference.includes("WD19") || p.reference.includes("HP 2013")) {
      target = { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Stations d'Accueil & Hubs", sousCategorie: "Docks USB-C, Thunderbolt & Stations d'Accueil" };
    } else if (p.reference.includes("Kit rails") || p.reference.includes("Cable Arm")) {
      target = { famille: "SERVEURS & INFRASTRUCTURE", categorie: "Accessoires Châssis & Baies", sousCategorie: "Rails, PDU & Gestion des Câbles" };
    } else if (p.reference.includes("FlexLOM") || p.reference.includes("X550-T2")) {
      target = { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Cartes d'Extension Internes", sousCategorie: "Cartes Réseau Internes (PCIe / FlexibleLOM)" };
    } else if (p.reference.includes("430-8e")) {
      target = { famille: "COMPOSANTS & CARTES D'EXTENSION", categorie: "Contrôleurs de Stockage", sousCategorie: "Contrôleurs RAID & Cartes HBA" };
    } else if (p.reference.includes("EliteBook")) {
      target = { famille: "ORDINATEURS", categorie: "PC Portables", sousCategorie: "Laptops & Ultrabooks" };
    } else if (p.reference.includes("Precision 3640")) {
      target = { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Stations de Travail & PC Gaming" };
    } else if (p.reference.includes("t540 Thin Client")) {
      target = { famille: "ORDINATEURS", categorie: "PC Fixes & Tout-en-un", sousCategorie: "Mini PC & Clients Légers" };
    } else if (p.reference.includes("ThinkSmart Hub 500")) {
      target = { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Audio & Vidéo Professionnelle", sousCategorie: "Systèmes de Visioconférence & Caméras" };
    } else if (p.reference.includes("Caddy SAS 300GO vide")) {
      target = { famille: "SERVEURS & INFRASTRUCTURE", categorie: "Accessoires Châssis & Baies", sousCategorie: "Caddies, Tiroirs & Câblage Serveur" };
    } else if (p.reference.includes("Intel D7-P5520")) {
      target = { famille: "STOCKAGE", categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD M.2 NVMe & PCIe" };
    } else if (p.reference.includes("DT24TSR-371")) {
      target = { famille: "PÉRIPHÉRIQUES & CONNECTIQUE", categorie: "Accessoires Moniteurs", sousCategorie: "Supports & Bras Articulés pour Écrans" };
    }
    // END EXCEPTIONS

    if (!target && rawCat && MAPPING_LEGACY[rawCat]) {
      target = MAPPING_LEGACY[rawCat];
    }
    
    // Check ambigus
    if (p.reference.includes("sans Caddy") || p.reference.includes("Tours Fractal Design") || p.reference.includes("Lenovo 16 GB")) {
      ambiguous++;
      continue;
    }

    if (target) {
      let key = `${target.famille}_${target.categorie}`;
      if (target.sousCategorie) key += `_${target.sousCategorie}`;
      
      const cid = nodeIds.get(key);
      if (cid) {
        await prisma.produit.update({ where: { id: p.id }, data: { categorie_id: cid } });
        updated++;
      }
    }
  }

  console.log(`Updated ${updated} products. ${ambiguous} marked ambiguous.`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
