import crypto from "crypto";

export interface AnalyseResultat {
  id: string;
  groupe_categorie: string;
  groupe_reference: string;
  cible_modele_nom: string | null;
  cible_attributs: Record<string, any> | null;
  statut: "en_attente" | "conflit" | "valide" | "rejete";
  confiance: number;
  raisons: string[];
  nb_produits: number;
}

const MARQUES_CONNUES = ["HP", "Dell", "Lenovo", "Apple", "Samsung", "Asus", "Acer", "Toshiba", "Sony", "Logitech", "Epson", "Canon", "Brother"];
const CATEGORIES_RACINES = ["Chargeur", "Imprimante", "Serveur", "Disque", "RAM", "Batterie", "Ecran", "Clavier", "Souris", "Cable"];

export function genererHashGroupe(categorie: string, reference: string): string {
  return crypto.createHash("sha256").update(`${categorie}|${reference}`).digest("hex");
}

export function analyserGroupe(categorieLegacy: string, referenceLegacy: string, nbProduits: number): AnalyseResultat {
  const raisons: string[] = [];
  let confiance = 0;
  let conflit = false;

  const texteComplet = `${categorieLegacy} ${referenceLegacy}`.toLowerCase();
  
  // Normalisation des unités
  const textNormalise = texteComplet
    .replace(/\b(\d+)\s*(w|watts)\b/g, "$1W")
    .replace(/\b(\d+)\s*(gb|go|giga)\b/g, "$1GB")
    .replace(/\b(\d+)\s*(tb|to|tera)\b/g, "$1TB")
    .replace(/\b(ssd|solid state drive)\b/g, "SSD")
    .replace(/\b(hdd|hard drive|disque dur)\b/g, "HDD");

  let modeleNom = referenceLegacy.trim();
  const attributs: Record<string, any> = {};

  // 1. Détection de la racine (Catégorie implicite)
  let racineTrouvee = null;
  for (const racine of CATEGORIES_RACINES) {
    if (textNormalise.includes(racine.toLowerCase())) {
      if (racineTrouvee && racineTrouvee !== racine) {
        conflit = true;
        raisons.push(`⚠ Conflit de type détecté : ${racineTrouvee} vs ${racine}`);
      } else {
        racineTrouvee = racine;
      }
    }
  }

  if (racineTrouvee) {
    confiance += 40;
    raisons.push(`✓ Type détecté : ${racineTrouvee}`);
  }

  // 2. Détection de la marque
  let marqueTrouvee = null;
  for (const marque of MARQUES_CONNUES) {
    if (textNormalise.includes(marque.toLowerCase())) {
      if (marqueTrouvee && marqueTrouvee !== marque) {
        conflit = true;
        raisons.push(`⚠ Conflit de marque détecté : ${marqueTrouvee} vs ${marque}`);
      } else {
        marqueTrouvee = marque;
      }
    }
  }

  if (marqueTrouvee) {
    confiance += 30;
    attributs["Marque"] = marqueTrouvee;
    raisons.push(`✓ Marque reconnue : ${marqueTrouvee}`);
  }

  // 3. Extraction d'attributs techniques
  const matchPuissance = textNormalise.match(/\b(\d+)W\b/i);
  if (matchPuissance) {
    confiance += 20;
    attributs["Puissance"] = `${matchPuissance[1]}W`;
    raisons.push(`✓ Puissance détectée : ${matchPuissance[1]}W`);
  }

  const matchCapaciteGB = textNormalise.match(/\b(\d+)GB\b/i);
  if (matchCapaciteGB) {
    confiance += 20;
    attributs["Capacité"] = `${matchCapaciteGB[1]}GB`;
    raisons.push(`✓ Capacité détectée : ${matchCapaciteGB[1]}GB`);
  }

  const matchCapaciteTB = textNormalise.match(/\b(\d+)TB\b/i);
  if (matchCapaciteTB) {
    confiance += 20;
    attributs["Capacité"] = `${matchCapaciteTB[1]}TB`;
    raisons.push(`✓ Capacité détectée : ${matchCapaciteTB[1]}TB`);
  }

  // Déductions spécifiques (ex: Disque)
  if (textNormalise.includes("ssd")) {
    attributs["Type Disque"] = "SSD";
    raisons.push(`✓ Type physique : SSD`);
  } else if (textNormalise.includes("hdd")) {
    attributs["Type Disque"] = "HDD";
    raisons.push(`✓ Type physique : HDD`);
  }

  // Normalisation du nom de modèle (on enlève la catégorie si elle est au début)
  // Ex: "Chargeur Lenovo 65W" -> "Lenovo 65W"
  if (racineTrouvee && categorieLegacy.toLowerCase().includes(racineTrouvee.toLowerCase())) {
     if (referenceLegacy.length < 5) {
        modeleNom = `${marqueTrouvee ? marqueTrouvee + " " : ""}${referenceLegacy}`;
     }
  }

  if (confiance > 100) confiance = 100;

  let statut: "en_attente" | "conflit" | "valide" | "rejete" = "en_attente";
  
  if (conflit) {
    confiance = 0;
    statut = "conflit";
  } else if (confiance < 50) {
    raisons.push(`⚠ Trop peu d'informations pour une classification sûre.`);
  }

  return {
    id: genererHashGroupe(categorieLegacy, referenceLegacy),
    groupe_categorie: categorieLegacy,
    groupe_reference: referenceLegacy,
    cible_modele_nom: modeleNom.trim() || null,
    cible_attributs: Object.keys(attributs).length > 0 ? attributs : null,
    statut,
    confiance,
    raisons,
    nb_produits: nbProduits
  };
}
