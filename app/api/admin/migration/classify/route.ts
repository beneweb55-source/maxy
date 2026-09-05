import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

/**
 * Route unique d'application de la classification.
 * Crée l'arbre de catégories s'il n'existe pas, puis met à jour `categorie_id`
 * sur chaque produit en se basant sur sa catégorie texte legacy.
 * 
 * Sécurité : 100% additif, ne supprime et ne modifie rien d'existant.
 * Idempotent : peut être exécuté plusieurs fois sans effet secondaire.
 */

const TREE = [
  { nom: "ORDINATEURS", categories: ["PC PORTABLES", "PC DE BUREAU", "MINI PC", "ALL-IN-ONE", "STATIONS DE TRAVAIL", "TERMINAUX POS"] },
  { nom: "SERVEURS", categories: ["SERVEURS RACK", "SERVEURS TOUR"] },
  { nom: "STOCKAGE", categories: [
    { nom: "DISQUES DURS", sousCategories: ["SAS", "SATA"] },
    { nom: "SSD", sousCategories: ["SATA", "SAS", "NVMe"] },
    "STOCKAGE RÉSEAU (NAS / DAS)"
  ]},
  { nom: "MÉMOIRE", categories: ["RAM DESKTOP", "RAM SERVEUR"] },
  { nom: "COMPOSANTS INTERNES", categories: ["PROCESSEURS", "CARTES GRAPHIQUES", "CARTES RÉSEAU", "CONTRÔLEURS RAID / HBA", "ADAPTATEURS & RISERS", "ALIMENTATIONS SERVEUR", "REFROIDISSEMENT SERVEUR"] },
  { nom: "PÉRIPHÉRIQUES", categories: ["ÉCRANS", "CLAVIERS & SOURIS", "STATIONS D'ACCUEIL", "SUPPORTS ÉCRAN", "VISIOCONFÉRENCE", "ADAPTATEURS RÉSEAU USB"] },
  { nom: "ALIMENTATION & CÂBLES", categories: ["CHARGEURS PC PORTABLE", "CÂBLES", "ONDULEURS (UPS)"] },
  { nom: "IMPRESSION", categories: ["IMPRIMANTES", "CONSOMMABLES"] },
  { nom: "RÉSEAU & INFRASTRUCTURE", categories: ["SWITCHES", "PDU & ACCESSOIRES RACK"] }
];

// Mapping complet : ancienne catégorie texte → { famille, catégorie, sousCategorie? }
const MAPPING: Record<string, { famille: string; categorie: string; sousCategorie?: string }> = {
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
  // STOCKAGE - HDD
  "SATA HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SATA" },
  "SATA": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SATA" },
  "SATA- 3,5\" HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SATA" },
  "SAS 600GB/900GB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS - 2,5\" - 600GB / 900GB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS — 2,5\" — 300GB / 146GB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS - 2,5\" - 300GB / 146GB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS- 2,5\" - 1TB / 1,2TB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "SAS - 2,5\" - 450GB HDD": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "Stockage-Disque SAS": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 1.2TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 1.8TB/2.4TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 300GB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 4TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  "DISQUES DURS SAS 8TB/10TB/12TB": { famille: "STOCKAGE", categorie: "DISQUES DURS", sousCategorie: "SAS" },
  // STOCKAGE - SSD
  "SATA SSD": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "SATA" },
  "SAS / NVMe SSD": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "SAS" },
  "SAS / NVMe - 2,5\" SSD": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "SAS" },
  "NVMe": { famille: "STOCKAGE", categorie: "SSD", sousCategorie: "NVMe" },
  // STOCKAGE - NAS
  "NAS / DAS": { famille: "STOCKAGE", categorie: "STOCKAGE RÉSEAU (NAS / DAS)" },
  "NAS, DAS & SAUVEGARDE": { famille: "STOCKAGE", categorie: "STOCKAGE RÉSEAU (NAS / DAS)" },
  // MÉMOIRE
  "RAM PC BUREAU": { famille: "MÉMOIRE", categorie: "RAM DESKTOP" },
  "RAM DESKTOP": { famille: "MÉMOIRE", categorie: "RAM DESKTOP" },
  "RAM PORTABLE": { famille: "MÉMOIRE", categorie: "RAM DESKTOP", sousCategorie: "Mini PC & PC Portable (SODIMM)" },
  "RAM SODIMM": { famille: "MÉMOIRE", categorie: "RAM DESKTOP", sousCategorie: "Mini PC & PC Portable (SODIMM)" },
  "RAM PC PORTABLE": { famille: "MÉMOIRE", categorie: "RAM DESKTOP", sousCategorie: "Mini PC & PC Portable (SODIMM)" },
  "RAM SERVEUR": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "RAM ECC": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "RAM ECC REG": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "MÉMOIRE (RAM)": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "Samsung": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "Kingston": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "Micron": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "PNY Technologies Europe": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  "SK hynix": { famille: "MÉMOIRE", categorie: "RAM SERVEUR" },
  // COMPOSANTS INTERNES
  "INTEL": { famille: "COMPOSANTS INTERNES", categorie: "PROCESSEURS" },
  "Processeur": { famille: "COMPOSANTS INTERNES", categorie: "PROCESSEURS" },
  "CPU": { famille: "COMPOSANTS INTERNES", categorie: "PROCESSEURS" },
  "PROCESSEURS": { famille: "COMPOSANTS INTERNES", categorie: "PROCESSEURS" },
  "Processeurs (CPU)": { famille: "COMPOSANTS INTERNES", categorie: "PROCESSEURS" },
  "CARTE GRAPHIQUE": { famille: "COMPOSANTS INTERNES", categorie: "CARTES GRAPHIQUES" },
  "CARTES GRAPHIQUES": { famille: "COMPOSANTS INTERNES", categorie: "CARTES GRAPHIQUES" },
  "Carte reseau": { famille: "COMPOSANTS INTERNES", categorie: "CARTES RÉSEAU" },
  "Controlleur": { famille: "COMPOSANTS INTERNES", categorie: "CONTRÔLEURS RAID / HBA" },
  "CONTRÔLEURS ET HBA": { famille: "COMPOSANTS INTERNES", categorie: "CONTRÔLEURS RAID / HBA" },
  "Cartes raid": { famille: "COMPOSANTS INTERNES", categorie: "CONTRÔLEURS RAID / HBA" },
  "CARTES D'ACQUISITION ET CARTES D'EXTENSION": { famille: "COMPOSANTS INTERNES", categorie: "ADAPTATEURS & RISERS" },
  "Riser": { famille: "COMPOSANTS INTERNES", categorie: "ADAPTATEURS & RISERS" },
  "ADAPTATEURS": { famille: "COMPOSANTS INTERNES", categorie: "ADAPTATEURS & RISERS" },
  "BLOC ALIMENTATION": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "COMPOSANTS": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "HPE / HP(ALIMENTATIONS SERVEUR)": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "DELL (ALIMENTATIONS SERVEUR)": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "IBM / LENOVO (ALIMENTATIONS SERVEUR)": { famille: "COMPOSANTS INTERNES", categorie: "ALIMENTATIONS SERVEUR" },
  "Refroidissement & Ventilateurs": { famille: "COMPOSANTS INTERNES", categorie: "REFROIDISSEMENT SERVEUR" },
  "Ventillateurs": { famille: "COMPOSANTS INTERNES", categorie: "REFROIDISSEMENT SERVEUR" },
  "REFROIDISSEMENT SERVEUR": { famille: "COMPOSANTS INTERNES", categorie: "REFROIDISSEMENT SERVEUR" },
  // PÉRIPHÉRIQUES
  "Ecran": { famille: "PÉRIPHÉRIQUES", categorie: "ÉCRANS" },
  "ecran": { famille: "PÉRIPHÉRIQUES", categorie: "ÉCRANS" },
  "Écrans": { famille: "PÉRIPHÉRIQUES", categorie: "ÉCRANS" },
  "Moniteurs (Écrans)": { famille: "PÉRIPHÉRIQUES", categorie: "ÉCRANS" },
  "Clavier": { famille: "PÉRIPHÉRIQUES", categorie: "CLAVIERS & SOURIS" },
  "CLAVIERS & SOURIS": { famille: "PÉRIPHÉRIQUES", categorie: "CLAVIERS & SOURIS" },
  "Souris": { famille: "PÉRIPHÉRIQUES", categorie: "CLAVIERS & SOURIS" },
  "CLAVIERS & PÉRIPHÉRIQUES": { famille: "PÉRIPHÉRIQUES", categorie: "CLAVIERS & SOURIS" },
  "CLAVIERS ET PÉRIPHÉRIQUES": { famille: "PÉRIPHÉRIQUES", categorie: "CLAVIERS & SOURIS" },
  "Docking": { famille: "PÉRIPHÉRIQUES", categorie: "STATIONS D'ACCUEIL" },
  "Docking station": { famille: "PÉRIPHÉRIQUES", categorie: "STATIONS D'ACCUEIL" },
  "STATIONS D'ACCUEIL ET HUBS": { famille: "PÉRIPHÉRIQUES", categorie: "STATIONS D'ACCUEIL" },
  "Station d'accueil": { famille: "PÉRIPHÉRIQUES", categorie: "STATIONS D'ACCUEIL" },
  "Stand": { famille: "PÉRIPHÉRIQUES", categorie: "SUPPORTS ÉCRAN" },
  "Support ecran": { famille: "PÉRIPHÉRIQUES", categorie: "SUPPORTS ÉCRAN" },
  "Camera": { famille: "PÉRIPHÉRIQUES", categorie: "VISIOCONFÉRENCE" },
  "WEBCAMS ET VISIOCONFÉRENCE": { famille: "PÉRIPHÉRIQUES", categorie: "VISIOCONFÉRENCE" },
  "ÉQUIPEMENTS DE VIDÉOCONFÉRENCE": { famille: "PÉRIPHÉRIQUES", categorie: "VISIOCONFÉRENCE" },
  "Dongle": { famille: "PÉRIPHÉRIQUES", categorie: "ADAPTATEURS RÉSEAU USB" },
  "ACCESSOIRES ET ÉQUIPEMENTS DE MONTAGE": { famille: "PÉRIPHÉRIQUES", categorie: "ADAPTATEURS RÉSEAU USB" },
  // ALIMENTATION & CÂBLES
  "chargeur": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur Pc portable": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur PC Portable": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Adapter": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Adaptateur": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur LENOVO": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur DELL": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Chargeur HP": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "CHARGEURS PC PORTABLE": { famille: "ALIMENTATION & CÂBLES", categorie: "CHARGEURS PC PORTABLE" },
  "Câble d'alimentation": { famille: "ALIMENTATION & CÂBLES", categorie: "CÂBLES" },
  "Cable Display": { famille: "ALIMENTATION & CÂBLES", categorie: "CÂBLES" },
  "Câbles USB, Vidéo, Réseau": { famille: "ALIMENTATION & CÂBLES", categorie: "CÂBLES" },
  "Cable": { famille: "ALIMENTATION & CÂBLES", categorie: "CÂBLES" },
  "UPS": { famille: "ALIMENTATION & CÂBLES", categorie: "ONDULEURS (UPS)" },
  "ONDULEURS": { famille: "ALIMENTATION & CÂBLES", categorie: "ONDULEURS (UPS)" },
  "ONDULEURS ET PROTECTION ÉLECTRIQUE (UPS)": { famille: "ALIMENTATION & CÂBLES", categorie: "ONDULEURS (UPS)" },
  // IMPRESSION
  "Imprimantes & Scanners": { famille: "IMPRESSION", categorie: "IMPRIMANTES" },
  "Imprimante": { famille: "IMPRESSION", categorie: "IMPRIMANTES" },
  "TONER": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "Consommables & Cartouches": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "HP - TONERS(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "AUTRES COMPATIBLES(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "CANON / KYOCERA(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  "EPSON - ENCRES(CONSOMMABLES D'IMPRESSION)": { famille: "IMPRESSION", categorie: "CONSOMMABLES" },
  // RÉSEAU & INFRASTRUCTURE
  "switch": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "SWITCHES" },
  "Switches": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "SWITCHES" },
  "Réseau & POS": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "SWITCHES" },
  "RESEAU-SWITCHES": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "SWITCHES" },
  "PDU": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "PDU & ACCESSOIRES RACK" },
  "Cable management": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "PDU & ACCESSOIRES RACK" },
  "PDU & ACCESSOIRES RACK": { famille: "RÉSEAU & INFRASTRUCTURE", categorie: "PDU & ACCESSOIRES RACK" },
};

async function getOrCreateCategorie(
  nom: string,
  parentId: number | null,
): Promise<number> {
  const existing = await prisma.categorie.findFirst({
    where: { nom, parent_id: parentId },
  });
  if (existing) return existing.id;
  const created = await prisma.categorie.create({
    data: { nom, parent_id: parentId, ordre: 0 },
  });
  return created.id;
}

export async function POST() {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  try {
    // 1. Construire l'arbre de catégories (idempotent)
    const catIds: Record<string, number> = {};

    for (const fam of TREE) {
      const famId = await getOrCreateCategorie(fam.nom, null);
      catIds[fam.nom] = famId;

      for (const cat of fam.categories) {
        if (typeof cat === "string") {
          catIds[`${fam.nom}>${cat}`] = await getOrCreateCategorie(cat, famId);
        } else {
          const catId = await getOrCreateCategorie(cat.nom, famId);
          catIds[`${fam.nom}>${cat.nom}`] = catId;
          for (const sous of cat.sousCategories) {
            catIds[`${fam.nom}>${cat.nom}>${sous}`] = await getOrCreateCategorie(sous, catId);
          }
        }
      }
    }

    // 2. Récupérer tous les produits sans categorie_id
    const produits = await prisma.produit.findMany({
      where: { categorie_id: null },
      select: { id: true, categorie: true },
    });

    let mapped = 0;
    let unmapped = 0;
    const unmappedCategories = new Map<string, number>();

    for (const p of produits) {
      // Essayer correspondance exacte
      let cible = MAPPING[p.categorie];

      // Si pas de correspondance exacte, essayer en nettoyant les caractères
      if (!cible) {
        const cleaned = p.categorie
          .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")  // zero-width chars
          .replace(/—/g, "-")  // em-dash → hyphen
          .replace(/–/g, "-")  // en-dash → hyphen
          .trim();
        cible = MAPPING[cleaned];
      }

      // Essayer case-insensitive
      if (!cible) {
        const lower = p.categorie.toLowerCase().trim();
        for (const [key, val] of Object.entries(MAPPING)) {
          if (key.toLowerCase().trim() === lower) {
            cible = val;
            break;
          }
        }
      }

      if (cible) {
        let path = `${cible.famille}>${cible.categorie}`;
        if (cible.sousCategorie) path += `>${cible.sousCategorie}`;
        const catId = catIds[path];
        if (catId) {
          // Synchroniser le texte legacy avec le nom de la catégorie cible
          const nomCible = cible.sousCategorie || cible.categorie;
          await prisma.produit.update({
            where: { id: p.id },
            data: { categorie_id: catId, categorie: nomCible },
          });
          mapped++;
        }
      } else {
        unmapped++;
        unmappedCategories.set(p.categorie, (unmappedCategories.get(p.categorie) ?? 0) + 1);
      }
    }

    return NextResponse.json({
      success: true,
      categories_creees: Object.keys(catIds).length,
      produits_mappes: mapped,
      produits_non_mappes: unmapped,
      categories_non_mappees: Object.fromEntries(unmappedCategories),
    });
  } catch (error) {
    console.error("Erreur classification:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
