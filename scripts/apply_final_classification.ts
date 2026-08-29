import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = "postgresql://maxy:maxy@localhost:5433/gestion_maxy";
const prisma = new PrismaClient();

const TREE = [
  {
    nom: "ORDINATEURS",
    categories: ["PC PORTABLES", "PC DE BUREAU", "MINI PC", "ALL-IN-ONE", "STATIONS DE TRAVAIL", "TERMINAUX POS"]
  },
  {
    nom: "SERVEURS",
    categories: ["SERVEURS RACK", "SERVEURS TOUR"]
  },
  {
    nom: "STOCKAGE",
    categories: [
      { nom: "DISQUES DURS", sousCategories: ["SAS", "SATA"] },
      { nom: "SSD", sousCategories: ["SATA", "SAS", "NVMe"] },
      "STOCKAGE RÉSEAU (NAS / DAS)"
    ]
  },
  {
    nom: "MÉMOIRE",
    categories: ["RAM DESKTOP", "RAM SERVEUR"]
  },
  {
    nom: "COMPOSANTS INTERNES",
    categories: [
      "PROCESSEURS", "CARTES GRAPHIQUES", "CARTES RÉSEAU",
      "CONTRÔLEURS RAID / HBA", "ADAPTATEURS & RISERS",
      "ALIMENTATIONS SERVEUR", "REFROIDISSEMENT SERVEUR"
    ]
  },
  {
    nom: "PÉRIPHÉRIQUES",
    categories: [
      "ÉCRANS", "CLAVIERS & SOURIS", "STATIONS D'ACCUEIL",
      "SUPPORTS ÉCRAN", "VISIOCONFÉRENCE", "ADAPTATEURS RÉSEAU USB"
    ]
  },
  {
    nom: "ALIMENTATION & CÂBLES",
    categories: ["CHARGEURS PC PORTABLE", "CÂBLES", "ONDULEURS (UPS)"]
  },
  {
    nom: "IMPRESSION",
    categories: ["IMPRIMANTES", "CONSOMMABLES"]
  },
  {
    nom: "RÉSEAU & INFRASTRUCTURE",
    categories: ["SWITCHES", "PDU & ACCESSOIRES RACK"]
  }
];

const MAPPING_LEGACY: Record<string, { famille: string, categorie: string, sousCategorie?: string }> = {
  // ORDINATEURS
  "Ordinateurs PC": { famille: "ORDINATEURS", categorie: "PC DE BUREAU" },
  "PC BUREAU": { famille: "ORDINATEURS", categorie: "PC DE BUREAU" },
  "PC BUREAU SSF": { famille: "ORDINATEURS", categorie: "PC DE BUREAU" },
  "Ordinateurs Pc Gamer": { famille: "ORDINATEURS", categorie: "PC DE BUREAU" },
  "Mini pc": { famille: "ORDINATEURS", categorie: "MINI PC" },
  "ORDINATEURS DE BUREAU (MINI PC)": { famille: "ORDINATEURS", categorie: "MINI PC" },
  "PC ALL IN ONE": { famille: "ORDINATEURS", categorie: "ALL-IN-ONE" },
  "All in One": { famille: "ORDINATEURS", categorie: "ALL-IN-ONE" },
  "Station de travail": { famille: "ORDINATEURS", categorie: "STATIONS DE TRAVAIL" },
  "Matériel POS": { famille: "ORDINATEURS", categorie: "TERMINAUX POS" },
  "Matériel Point de Vente (POS)": { famille: "ORDINATEURS", categorie: "TERMINAUX POS" },
  "PC PORTABLE": { famille: "ORDINATEURS", categorie: "PC PORTABLES" },
  "laptop": { famille: "ORDINATEURS", categorie: "PC PORTABLES" },

  // SERVEURS
  "SERVEURS": { famille: "SERVEURS", categorie: "SERVEURS RACK" },
  "serveurs rack": { famille: "SERVEURS", categorie: "SERVEURS RACK" },
  "SERVEUR TOUR": { famille: "SERVEURS", categorie: "SERVEURS TOUR" },
  "serveurs Tour": { famille: "SERVEURS", categorie: "SERVEURS TOUR" },

  // STOCKAGE
  "SATA HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SATA" },
  "SATA": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SATA" },
  "SATA- 3,5\" HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SATA" },
  "SAS 600GB/900GB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS - 2,5\" - 600GB / 900GB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS - 2,5\" - 300GB / 146GB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS- 2,5\" - 1TB / 1,2TB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS - 2,5\" - 450GB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "Stockage-Disque SAS": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 1.2TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 1.8TB/2.4TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 300GB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 4TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 8TB/10TB/12TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SATA SSD": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "SATA" },
  "SAS / NVMe SSD": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "SAS" },
  "SAS / NVMe - 2,5\" SSD": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "SAS" },
  "NVMe": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "NVMe" },
  "NAS / DAS": { famille: "STOCKAGE", categorie: "STOCKAGE RÉSEAU (NAS / DAS)" },
  "NAS, DAS & SAUVEGARDE": { famille: "STOCKAGE", categorie: "STOCKAGE RÉSEAU (NAS / DAS)" },

  // MÉMOIRE
  "MÉMOIRE": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "RAM ECC": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "Samsung": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" }, 
  "Kingston": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "SK hynix": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "PNY Technologies Europe": { famille: "MÉMOIRE", categorie: "RAM DESKTOP" },
  "Micron": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },

  // COMPOSANTS
  "INTEL": { famille: "COMPOSANTS INTERNES", categorie: "PROCESSEURS" },
  "Processeurs (CPU)": { famille: "COMPOSANTS INTERNES", categorie: "PROCESSEURS" },
  "CARTES GRAPHIQUES": { famille: "COMPOSANTS INTERNES", categorie: "CARTES GRAPHIQUES" },
  "CARTE GRAPHIQUE": { famille: "COMPOSANTS INTERNES", categorie: "CARTES GRAPHIQUES" },
  "CARTES D'ACQUISITION ET RISERS": { famille: "COMPOSANTS INTERNES", categorie: "ADAPTATEURS & RISERS" },
  "CARTES D'ACQUISITION ET CARTES D'EXTENSION": { famille: "COMPOSANTS INTERNES", categorie: "ADAPTATEURS & RISERS" },
  "ADAPTATEURS": { famille: "COMPOSANTS INTERNES", categorie: "ADAPTATEURS & RISERS" },
  "COMPOSANTS": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "HPE / HP(ALIMENTATIONS SERVEUR)": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "DELL (ALIMENTATIONS SERVEUR)": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "IBM / LENOVO (ALIMENTATIONS SERVEUR)": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "REFROIDISSEMENT SERVEUR": { famille: "COMPOSANTS INTERNES", categorie: "REFROIDISSEMENT SERVEUR" },
  "Cartes raid": { famille: "COMPOSANTS INTERNES", categorie: "CONTRÔLEURS RAID / HBA" },

  // PÉRIPHÉRIQUES
  "Écrans": { famille: "PÉRIPHÉRIQUES", categorie: "ÉCRANS" },
  "ecran": { famille: "PÉRIPHÉRIQUES", categorie: "ÉCRANS" },
  "CLAVIERS & PÉRIPHÉRIQUES": { famille: "PÉRIPHÉRIQUES", categorie: "CLAVIERS & SOURIS" },
  "CLAVIERS ET PÉRIPHÉRIQUES": { famille: "PÉRIPHÉRIQUES", categorie: "CLAVIERS & SOURIS" },
  "Station d'accueil": { famille: "PÉRIPHÉRIQUES", categorie: "STATIONS D'ACCUEIL" },
  "Support ecran": { famille: "PÉRIPHÉRIQUES", categorie: "SUPPORTS ÉCRAN" },
  "ACCESSOIRES ET ÉQUIPEMENTS DE MONTAGE": { famille: "PÉRIPHÉRIQUES", categorie: "ADAPTATEURS RÉSEAU USB" }, 
  "ÉQUIPEMENTS DE VIDÉOCONFÉRENCE": { famille: "PÉRIPHÉRIQUES", categorie: "VISIOCONFÉRENCE" },

  // ALIMENTATION
  "Adapter": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur LENOVO": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur DELL": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur HP": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Câbles USB, Vidéo, Réseau": { famille: "ALIMENTATION & CÂBLES", categorie: "CÂBLES" },
  "Cable": { famille: "ALIMENTATION & CÂBLES", categorie: "CÂBLES" },
  "ONDULEURS": { famille: "ALIMENTATION & CÂBLES", categorie: "ONDULEURS (UPS)" },
  "ONDULEURS ET PROTECTION ÉLECTRIQUE (UPS)": { famille: "ALIMENTATION & CÂBLES", categorie: "ONDULEURS (UPS)" },

  // IMPRESSION
  "Imprimante": { famille: "IMPRESSION", categorie: "IMPRIMANTES" },
  "Consommables & Cartouches": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "HP - TONERS(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "AUTRES COMPATIBLES(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "CANON / KYOCERA(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "EPSON - ENCRES(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },

  // RÉSEAU
  "Réseau & POS": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "SWITCHES" }, 
  "RESEAU-SWITCHES": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "SWITCHES" },
  "PDU & ACCESSOIRES RACK": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "PDU & ACCESSOIRES RACK" },
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
      target = { famille: "PÉRIPHÉRIQUES", categorie: "STATIONS D'ACCUEIL" };
    } else if (p.reference.includes("Kit rails") || p.reference.includes("Cable Arm")) {
      target = { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "PDU & ACCESSOIRES RACK" };
    } else if (p.reference.includes("FlexLOM") || p.reference.includes("X550-T2")) {
      target = { famille: "COMPOSANTS INTERNES", categorie: "CARTES RÉSEAU" };
    } else if (p.reference.includes("430-8e")) {
      target = { famille: "COMPOSANTS INTERNES", categorie: "CONTRÔLEURS RAID / HBA" };
    } else if (p.reference.includes("EliteBook")) {
      target = { famille: "ORDINATEURS", categorie: "PC PORTABLES" };
    } else if (p.reference.includes("Precision 3640")) {
      target = { famille: "ORDINATEURS", categorie: "STATIONS DE TRAVAIL" };
    } else if (p.reference.includes("t540 Thin Client")) {
      target = { famille: "ORDINATEURS", categorie: "PC DE BUREAU" };
    } else if (p.reference.includes("ThinkSmart Hub 500")) {
      target = { famille: "PÉRIPHÉRIQUES", categorie: "VISIOCONFÉRENCE" };
    } else if (p.reference.includes("Caddy SAS 300GO vide")) {
      target = { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "PDU & ACCESSOIRES RACK" };
    } else if (p.reference.includes("Intel D7-P5520")) {
      target = { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "NVMe" };
    } else if (p.reference.includes("DT24TSR-371")) {
      target = { famille: "PÉRIPHÉRIQUES", categorie: "SUPPORTS ÉCRAN" };
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
