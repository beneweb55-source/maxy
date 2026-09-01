import { PrismaClient } from "@prisma/client";
import { classifyProduct } from "./test_full_classification";

const prisma = new PrismaClient();

const TREE = {
  "STOCKAGE": {
    "Disques Durs Mécaniques (HDD)": [
      "Disques Durs SAS 2,5\" (10K / 15K RPM)",
      "Disques Durs SAS 3,5\" (7.2K / 15K RPM)",
      "Disques Durs SATA 3,5\" (Bureautique / NAS)"
    ],
    "Disques Flash (SSD)": [
      "Disques SSD 2,5\" SATA",
      "Disques SSD M.2 NVMe & PCIe",
      "Disques SSD Entreprise (SAS / U.2 PCIe)"
    ],
    "Stockage Réseau & Baies (NAS / DAS)": [
      "Serveurs NAS, DAS & Sauvegarde"
    ]
  },
  "COMPOSANTS & CARTES D'EXTENSION": {
    "Cartes Graphiques (GPU)": [
      "Cartes Graphiques Grand Public (GeForce / Radeon)",
      "Cartes Graphiques Professionnelles (Quadro / RTX Pro)"
    ],
    "Refroidissement & Châssis": [
      "Dissipateurs Thermiques & Ventilateurs Serveur"
    ],
    "Contrôleurs de Stockage": [
      "Contrôleurs RAID & Cartes HBA"
    ],
    "Cartes d'Extension Internes": [
      "Cartes Réseau Internes (PCIe / FlexibleLOM)",
      "Risers, Adaptateurs PCIe & Cartes d'Acquisition"
    ]
  },
  "ORDINATEURS": {
    "PC Fixes & Tout-en-un": [
      "Mini PC & Clients Légers",
      "Stations de Travail & PC Gaming",
      "Tours & Formats SFF",
      "Tout-en-un (All-in-One)"
    ],
    "PC Portables": [
      "Laptops & Ultrabooks"
    ],
    "Matériel Point de Vente (POS)": [
      "Terminaux & Caisses Tactiles (TPV)"
    ]
  },
  "PÉRIPHÉRIQUES & CONNECTIQUE": {
    "Câbles & Connectique": [
      "Câbles USB, Vidéo & Alimentation"
    ],
    "Adaptateurs & Convertisseurs": [
      "Adaptateurs Réseau USB & Convertisseurs"
    ],
    "Accessoires Moniteurs": [
      "Supports & Bras Articulés pour Écrans"
    ],
    "Stations d'Accueil & Hubs": [
      "Docks USB-C, Thunderbolt & Stations d'Accueil"
    ],
    "Périphériques de Saisie": [
      "Claviers, Souris & Combos"
    ],
    "Moniteurs & Affichage": [
      "Écrans & Moniteurs Bureautique / Pro"
    ],
    "Audio & Vidéo Professionnelle": [
      "Systèmes de Visioconférence & Caméras"
    ]
  },
  "SERVEURS & INFRASTRUCTURE": {
    "Serveurs": [
      "Serveurs Tour",
      "Serveurs Rack (1U / 2U / 4U)"
    ],
    "Accessoires Châssis & Baies": [
      "Caddies, Tiroirs & Câblage Serveur",
      "Rails, PDU & Gestion des Câbles"
    ]
  },
  "ÉLECTRICITÉ & ALIMENTATION": {
    "Chargeurs & Alimentation Externe": [
      "Chargeurs Embout Propriétaire (Jack / Slim Tip)",
      "Chargeurs USB-C (Type-C)"
    ],
    "Alimentations Internes": [
      "Alimentations Serveur (Redondantes / Hot-Plug)"
    ],
    "Protection Électrique & Onduleurs": [
      "Onduleurs (UPS) Tour & Rack",
      "Modules Batterie & Accessoires UPS"
    ]
  },
  "IMPRESSION & CONSOMMABLES": {
    "Imprimantes & Scanners": [
      "Imprimantes Laser & Multifonctions",
      "Imprimantes Étiquettes & Code-barres"
    ],
    "Consommables d'Impression": [
      "Cartouches d'Encre",
      "Toners & Tambours Laser"
    ]
  },
  "MÉMOIRE & PROCESSEURS": {
    "Processeurs (CPU)": [
      "Processeurs PC (Intel Core / AMD Ryzen)",
      "Processeurs Serveur (Intel Xeon / AMD EPYC)"
    ],
    "Mémoire Vive (RAM)": [
      "RAM PC Fixe (UDIMM / Non-ECC)",
      "RAM Serveur (ECC Registered / RDIMM)"
    ]
  },
  "RÉSEAU ACTIF & COMMUTATION": {
    "Commutateurs & Routage": [
      "Switches Réseau (Manageables / PoE)"
    ]
  },
  "DIVERS": {
    "Non Classé": [
      "À Classifier"
    ]
  }
};

async function main() {
  console.log("Démarrage de la migration de la classification...");

  // 1. Ensure categories exist
  let familleOrdre = 10;
  const categoryMap = new Map<string, number>();

  for (const [familleNom, categories] of Object.entries(TREE)) {
    let famille = await prisma.categorie.findFirst({ where: { nom: familleNom, parent_id: null } });
    if (!famille) {
      famille = await prisma.categorie.create({ data: { nom: familleNom, ordre: familleOrdre } });
    } else {
      await prisma.categorie.update({ where: { id: famille.id }, data: { ordre: familleOrdre } });
    }
    categoryMap.set(familleNom, famille.id);
    familleOrdre += 10;

    let catOrdre = 10;
    for (const [catNom, sousCats] of Object.entries(categories)) {
      let cat = await prisma.categorie.findFirst({ where: { nom: catNom, parent_id: famille.id } });
      if (!cat) {
        cat = await prisma.categorie.create({ data: { nom: catNom, parent_id: famille.id, ordre: catOrdre } });
      } else {
        await prisma.categorie.update({ where: { id: cat.id }, data: { ordre: catOrdre } });
      }
      categoryMap.set(`${familleNom}|${catNom}`, cat.id);
      catOrdre += 10;

      let sousCatOrdre = 10;
      for (const scNom of sousCats) {
        let sc = await prisma.categorie.findFirst({ where: { nom: scNom, parent_id: cat.id } });
        if (!sc) {
          sc = await prisma.categorie.create({ data: { nom: scNom, parent_id: cat.id, ordre: sousCatOrdre } });
        } else {
          await prisma.categorie.update({ where: { id: sc.id }, data: { ordre: sousCatOrdre } });
        }
        categoryMap.set(`${familleNom}|${catNom}|${scNom}`, sc.id);
        sousCatOrdre += 10;
      }
    }
  }

  console.log("Arbre de catégories créé / vérifié avec succès.");

  // 2. Fetch all products
  const dbProducts = await prisma.produit.findMany({
    include: { modele: true }
  });

  console.log(`${dbProducts.length} produits trouvés en base.`);
  let updatedCount = 0;

  for (const p of dbProducts) {
    const classif = classifyProduct({
      id: p.id,
      reference: p.reference,
      categorie: p.categorie
    });

    const targetScId = categoryMap.get(`${classif.famille}|${classif.categorie}|${classif.sousCategorie}`);
    if (!targetScId) {
      throw new Error(`Catégorie introuvable pour ${classif.sousCategorie}`);
    }

    let modele_id = p.modele_id;
    if (modele_id && p.modele) {
      // Update modele's category to match the product's new category
      if (p.modele.categorie_id !== targetScId) {
        await prisma.modele.update({
          where: { id: modele_id },
          data: { categorie_id: targetScId }
        });
      }
    } else {
      // Create a model if none exists (just in case)
      const newModele = await prisma.modele.create({
        data: {
          nom: p.reference,
          categorie_id: targetScId
        }
      });
      modele_id = newModele.id;
    }

    // Update product
    if (p.categorie_id !== targetScId || p.categorie !== classif.sousCategorie || p.modele_id !== modele_id) {
      await prisma.produit.update({
        where: { id: p.id },
        data: {
          categorie_id: targetScId,
          categorie: classif.sousCategorie,
          modele_id: modele_id
        }
      });
      updatedCount++;
    }
  }

  console.log(`Migration terminée. ${updatedCount} produits mis à jour.`);

  // 3. Validation
  const totalPostMigration = await prisma.produit.count();
  console.log(`Comptage final post-migration: ${totalPostMigration} produits. Différence = ${totalPostMigration - dbProducts.length}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
