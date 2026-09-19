import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";
import { FAMILLES } from "@/lib/taxonomie-canonical";

/**
 * Route unique d'application de la classification.
 * Crée l'arbre de catégories s'il n'existe pas, puis met à jour `categorie_id`
 * sur chaque produit en se basant sur sa catégorie texte legacy.
 *
 * Sécurité : 100% additif, ne supprime et ne modifie rien d'existant.
 * Idempotent : peut être exécuté plusieurs fois sans effet secondaire.
 *
 * Les noms de familles/catégories sont importés depuis taxonomie-canonical.ts
 * pour garantir la cohérence avec la base de données et les autres moteurs.
 */

const TREE: Array<{
  nom: string;
  categories: Array<string | { nom: string; sousCategories: string[] }>;
}> = [
  { nom: FAMILLES.INFORMATIQUE, categories: ["PC Portables", "PC Fixes & Tout-en-un", "Matériel Point de Vente (POS)"] },
  { nom: FAMILLES.SERVEURS, categories: [
    { nom: "Serveurs", sousCategories: ["Serveurs Rack (1U / 2U / 4U)", "Serveurs Tour"] },
    { nom: "Accessoires Châssis & Baies", sousCategories: ["Caddies, Tiroirs & Câblage Serveur", "Rails, PDU & Gestion des Câbles"] },
  ]},
  { nom: FAMILLES.STOCKAGE, categories: [
    { nom: "Disques Durs Mécaniques (HDD)", sousCategories: ["Disques Durs SAS 2,5\" (10K / 15K RPM)", "Disques Durs SATA 3,5\" (Bureautique / NAS)"] },
    { nom: "Disques Flash (SSD)", sousCategories: ["Disques SSD 2,5\" SATA", "Disques SSD M.2 NVMe & PCIe", "Disques SSD Entreprise (SAS / U.2 PCIe)"] },
    { nom: "Stockage Réseau & Baies (NAS / DAS)", sousCategories: ["Serveurs NAS, DAS & Sauvegarde"] },
  ]},
  { nom: FAMILLES.MEMOIRE, categories: [
    { nom: "Mémoire Vive (RAM)", sousCategories: ["RAM PC Fixe (UDIMM / Non-ECC)", "RAM PC Portable (SO-DIMM)", "RAM Serveur (ECC Registered / RDIMM)"] },
  ]},
  { nom: FAMILLES.COMPOSANTS, categories: [
    { nom: "Processeurs (CPU)", sousCategories: ["Processeurs PC (Intel Core / AMD Ryzen)", "Processeurs Serveur (Intel Xeon / AMD EPYC)"] },
    { nom: "Cartes Graphiques (GPU)", sousCategories: ["Cartes Graphiques Grand Public (GeForce / Radeon)", "Cartes Graphiques Professionnelles (Quadro / RTX Pro)"] },
    { nom: "Refroidissement & Châssis", sousCategories: ["Dissipateurs Thermiques & Ventilateurs Serveur"] },
    { nom: "Contrôleurs de Stockage", sousCategories: ["Contrôleurs RAID & Cartes HBA"] },
    { nom: "Cartes d'Extension Internes", sousCategories: ["Cartes Réseau Internes (PCIe / FlexibleLOM)", "Risers, Adaptateurs PCIe & Cartes d'Acquisition"] },
  ]},
  { nom: FAMILLES.PERIPHERIQUES, categories: [
    { nom: "Moniteurs & Affichage", sousCategories: ["Écrans & Moniteurs Bureautique / Pro"] },
    { nom: "Périphériques de Saisie", sousCategories: ["Claviers, Souris & Combos"] },
    { nom: "Stations d'Accueil & Hubs", sousCategories: ["Docks USB-C, Thunderbolt & Stations d'Accueil"] },
    { nom: "Accessoires Moniteurs", sousCategories: ["Supports & Bras Articulés pour Écrans"] },
    { nom: "Audio & Vidéo Professionnelle", sousCategories: ["Systèmes de Visioconférence & Caméras"] },
    { nom: "Câbles & Connectique", sousCategories: ["Câbles USB, Vidéo & Alimentation"] },
    { nom: "Adaptateurs & Convertisseurs", sousCategories: ["Adaptateurs Réseau USB & Convertisseurs"] },
  ]},
  { nom: FAMILLES.ALIMENTATION, categories: [
    { nom: "Chargeurs & Alimentation Externe", sousCategories: ["Chargeurs Embout Propriétaire (Jack / Slim Tip)", "Chargeurs USB-C (Type-C)"] },
    { nom: "Alimentations Internes", sousCategories: ["Alimentations Serveur (Redondantes / Hot-Plug)"] },
    { nom: "Protection Électrique & Onduleurs", sousCategories: ["Onduleurs (UPS) Tour & Rack", "Modules Batterie & Accessoires UPS"] },
  ]},
  { nom: FAMILLES.IMPRESSION, categories: [
    { nom: "Imprimantes & Scanners", sousCategories: ["Imprimantes Laser & Multifonctions", "Imprimantes Étiquettes & Code-barres"] },
    { nom: "Consommables d'Impression", sousCategories: ["Cartouches d'Encre", "Toners & Tambours Laser"] },
  ]},
  { nom: FAMILLES.RESEAU, categories: [
    { nom: "Commutateurs & Routage", sousCategories: ["Switches Réseau (Manageables / PoE)"] },
  ]},
  { nom: "DIVERS", categories: [
    { nom: "Non Classé", sousCategories: ["À Classifier"] },
  ]},
];

// Mapping complet : ancienne catégorie texte → { famille, catégorie, sousCategorie? }
// Noms conformes à taxonomie-canonical.ts (FAMILLES + TREE)
const MAPPING: Record<string, { famille: string; categorie: string; sousCategorie?: string }> = {
  // ─── ORDINATEURS ───
  "Ordinateurs PC": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tours & Formats SFF" },
  "PC BUREAU": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tours & Formats SFF" },
  "PC BUREAU SSF": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tours & Formats SFF" },
  "Ordinateurs Pc Gamer": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Stations de Travail & PC Gaming" },
  "Mini pc": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Mini PC & Clients Légers" },
  "ORDINATEURS DE BUREAU (MINI PC)": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Mini PC & Clients Légers" },
  "PC ALL IN ONE": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tout-en-un (All-in-One)" },
  "All in One": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Tout-en-un (All-in-One)" },
  "Station de travail": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Fixes & Tout-en-un", sousCategorie: "Stations de Travail & PC Gaming" },
  "Matériel POS": { famille: FAMILLES.INFORMATIQUE, categorie: "Matériel Point de Vente (POS)", sousCategorie: "Terminaux & Caisses Tactiles (TPV)" },
  "Matériel Point de Vente (POS)": { famille: FAMILLES.INFORMATIQUE, categorie: "Matériel Point de Vente (POS)", sousCategorie: "Terminaux & Caisses Tactiles (TPV)" },
  "PC PORTABLE": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Portables", sousCategorie: "Laptops & Ultrabooks" },
  "laptop": { famille: FAMILLES.INFORMATIQUE, categorie: "PC Portables", sousCategorie: "Laptops & Ultrabooks" },
  // ─── SERVEURS & INFRASTRUCTURE ───
  "SERVEURS": { famille: FAMILLES.SERVEURS, categorie: "Serveurs", sousCategorie: "Serveurs Rack (1U / 2U / 4U)" },
  "serveurs rack": { famille: FAMILLES.SERVEURS, categorie: "Serveurs", sousCategorie: "Serveurs Rack (1U / 2U / 4U)" },
  "SERVEUR TOUR": { famille: FAMILLES.SERVEURS, categorie: "Serveurs", sousCategorie: "Serveurs Tour" },
  "serveurs Tour": { famille: FAMILLES.SERVEURS, categorie: "Serveurs", sousCategorie: "Serveurs Tour" },
  // ─── STOCKAGE — HDD ───
  "SATA HDD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SATA 3,5\" (Bureautique / NAS)" },
  "SATA": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SATA 3,5\" (Bureautique / NAS)" },
  "SATA- 3,5\" HDD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SATA 3,5\" (Bureautique / NAS)" },
  "SAS 600GB/900GB HDD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS - 2,5\" - 600GB / 900GB HDD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS — 2,5\" — 300GB / 146GB": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS - 2,5\" - 300GB / 146GB": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS- 2,5\" - 1TB / 1,2TB HDD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "SAS - 2,5\" - 450GB HDD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "Stockage-Disque SAS": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 1.2TB": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 1.8TB/2.4TB": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 300GB": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 4TB": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  "DISQUES DURS SAS 8TB/10TB/12TB": { famille: FAMILLES.STOCKAGE, categorie: "Disques Durs Mécaniques (HDD)", sousCategorie: "Disques Durs SAS 2,5\" (10K / 15K RPM)" },
  // ─── STOCKAGE — SSD ───
  "SATA SSD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD 2,5\" SATA" },
  "SAS / NVMe SSD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD Entreprise (SAS / U.2 PCIe)" },
  "SAS / NVMe - 2,5\" SSD": { famille: FAMILLES.STOCKAGE, categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD Entreprise (SAS / U.2 PCIe)" },
  "NVMe": { famille: FAMILLES.STOCKAGE, categorie: "Disques Flash (SSD)", sousCategorie: "Disques SSD M.2 NVMe & PCIe" },
  // ─── STOCKAGE — NAS ───
  "NAS / DAS": { famille: FAMILLES.STOCKAGE, categorie: "Stockage Réseau & Baies (NAS / DAS)", sousCategorie: "Serveurs NAS, DAS & Sauvegarde" },
  "NAS, DAS & SAUVEGARDE": { famille: FAMILLES.STOCKAGE, categorie: "Stockage Réseau & Baies (NAS / DAS)", sousCategorie: "Serveurs NAS, DAS & Sauvegarde" },
  // ─── MÉMOIRE & PROCESSEURS ───
  "RAM PC BUREAU": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM PC Fixe (UDIMM / Non-ECC)" },
  "RAM DESKTOP": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM PC Fixe (UDIMM / Non-ECC)" },
  "RAM PORTABLE": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM PC Portable (SO-DIMM)" },
  "RAM SODIMM": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM PC Portable (SO-DIMM)" },
  "RAM PC PORTABLE": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM PC Portable (SO-DIMM)" },
  "RAM SERVEUR": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "RAM ECC": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "RAM ECC REG": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "MÉMOIRE (RAM)": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "Samsung": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "Kingston": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "Micron": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "PNY Technologies Europe": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  "SK hynix": { famille: FAMILLES.MEMOIRE, categorie: "Mémoire Vive (RAM)", sousCategorie: "RAM Serveur (ECC Registered / RDIMM)" },
  // ─── COMPOSANTS & CARTES D'EXTENSION ───
  "INTEL": { famille: FAMILLES.COMPOSANTS, categorie: "Processeurs (CPU)", sousCategorie: "Processeurs PC (Intel Core / AMD Ryzen)" },
  "Processeur": { famille: FAMILLES.COMPOSANTS, categorie: "Processeurs (CPU)", sousCategorie: "Processeurs PC (Intel Core / AMD Ryzen)" },
  "CPU": { famille: FAMILLES.COMPOSANTS, categorie: "Processeurs (CPU)", sousCategorie: "Processeurs PC (Intel Core / AMD Ryzen)" },
  "PROCESSEURS": { famille: FAMILLES.COMPOSANTS, categorie: "Processeurs (CPU)", sousCategorie: "Processeurs PC (Intel Core / AMD Ryzen)" },
  "Processeurs (CPU)": { famille: FAMILLES.COMPOSANTS, categorie: "Processeurs (CPU)", sousCategorie: "Processeurs PC (Intel Core / AMD Ryzen)" },
  "CARTE GRAPHIQUE": { famille: FAMILLES.COMPOSANTS, categorie: "Cartes Graphiques (GPU)", sousCategorie: "Cartes Graphiques Grand Public (GeForce / Radeon)" },
  "CARTES GRAPHIQUES": { famille: FAMILLES.COMPOSANTS, categorie: "Cartes Graphiques (GPU)", sousCategorie: "Cartes Graphiques Grand Public (GeForce / Radeon)" },
  "Carte reseau": { famille: FAMILLES.COMPOSANTS, categorie: "Cartes d'Extension Internes", sousCategorie: "Cartes Réseau Internes (PCIe / FlexibleLOM)" },
  "Controlleur": { famille: FAMILLES.COMPOSANTS, categorie: "Contrôleurs de Stockage", sousCategorie: "Contrôleurs RAID & Cartes HBA" },
  "CONTRÔLEURS ET HBA": { famille: FAMILLES.COMPOSANTS, categorie: "Contrôleurs de Stockage", sousCategorie: "Contrôleurs RAID & Cartes HBA" },
  "Cartes raid": { famille: FAMILLES.COMPOSANTS, categorie: "Contrôleurs de Stockage", sousCategorie: "Contrôleurs RAID & Cartes HBA" },
  "CARTES D'ACQUISITION ET CARTES D'EXTENSION": { famille: FAMILLES.COMPOSANTS, categorie: "Cartes d'Extension Internes", sousCategorie: "Risers, Adaptateurs PCIe & Cartes d'Acquisition" },
  "Riser": { famille: FAMILLES.COMPOSANTS, categorie: "Cartes d'Extension Internes", sousCategorie: "Risers, Adaptateurs PCIe & Cartes d'Acquisition" },
  "ADAPTATEURS": { famille: FAMILLES.COMPOSANTS, categorie: "Cartes d'Extension Internes", sousCategorie: "Risers, Adaptateurs PCIe & Cartes d'Acquisition" },
  "BLOC ALIMENTATION": { famille: FAMILLES.ALIMENTATION, categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "COMPOSANTS": { famille: FAMILLES.ALIMENTATION, categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "HPE / HP(ALIMENTATIONS SERVEUR)": { famille: FAMILLES.ALIMENTATION, categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "DELL (ALIMENTATIONS SERVEUR)": { famille: FAMILLES.ALIMENTATION, categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "IBM / LENOVO (ALIMENTATIONS SERVEUR)": { famille: FAMILLES.ALIMENTATION, categorie: "Alimentations Internes", sousCategorie: "Alimentations Serveur (Redondantes / Hot-Plug)" },
  "Refroidissement & Ventilateurs": { famille: FAMILLES.COMPOSANTS, categorie: "Refroidissement & Châssis", sousCategorie: "Dissipateurs Thermiques & Ventilateurs Serveur" },
  "Ventillateurs": { famille: FAMILLES.COMPOSANTS, categorie: "Refroidissement & Châssis", sousCategorie: "Dissipateurs Thermiques & Ventilateurs Serveur" },
  "REFROIDISSEMENT SERVEUR": { famille: FAMILLES.COMPOSANTS, categorie: "Refroidissement & Châssis", sousCategorie: "Dissipateurs Thermiques & Ventilateurs Serveur" },
  // ─── PÉRIPHÉRIQUES & CONNECTIQUE ───
  "Ecran": { famille: FAMILLES.PERIPHERIQUES, categorie: "Moniteurs & Affichage", sousCategorie: "Écrans & Moniteurs Bureautique / Pro" },
  "ecran": { famille: FAMILLES.PERIPHERIQUES, categorie: "Moniteurs & Affichage", sousCategorie: "Écrans & Moniteurs Bureautique / Pro" },
  "Écrans": { famille: FAMILLES.PERIPHERIQUES, categorie: "Moniteurs & Affichage", sousCategorie: "Écrans & Moniteurs Bureautique / Pro" },
  "Moniteurs (Écrans)": { famille: FAMILLES.PERIPHERIQUES, categorie: "Moniteurs & Affichage", sousCategorie: "Écrans & Moniteurs Bureautique / Pro" },
  "Clavier": { famille: FAMILLES.PERIPHERIQUES, categorie: "Périphériques de Saisie", sousCategorie: "Claviers, Souris & Combos" },
  "CLAVIERS & SOURIS": { famille: FAMILLES.PERIPHERIQUES, categorie: "Périphériques de Saisie", sousCategorie: "Claviers, Souris & Combos" },
  "Souris": { famille: FAMILLES.PERIPHERIQUES, categorie: "Périphériques de Saisie", sousCategorie: "Claviers, Souris & Combos" },
  "CLAVIERS & PÉRIPHÉRIQUES": { famille: FAMILLES.PERIPHERIQUES, categorie: "Périphériques de Saisie", sousCategorie: "Claviers, Souris & Combos" },
  "CLAVIERS ET PÉRIPHÉRIQUES": { famille: FAMILLES.PERIPHERIQUES, categorie: "Périphériques de Saisie", sousCategorie: "Claviers, Souris & Combos" },
  "Docking": { famille: FAMILLES.PERIPHERIQUES, categorie: "Stations d'Accueil & Hubs", sousCategorie: "Docks USB-C, Thunderbolt & Stations d'Accueil" },
  "Docking station": { famille: FAMILLES.PERIPHERIQUES, categorie: "Stations d'Accueil & Hubs", sousCategorie: "Docks USB-C, Thunderbolt & Stations d'Accueil" },
  "STATIONS D'ACCUEIL ET HUBS": { famille: FAMILLES.PERIPHERIQUES, categorie: "Stations d'Accueil & Hubs", sousCategorie: "Docks USB-C, Thunderbolt & Stations d'Accueil" },
  "Station d'accueil": { famille: FAMILLES.PERIPHERIQUES, categorie: "Stations d'Accueil & Hubs", sousCategorie: "Docks USB-C, Thunderbolt & Stations d'Accueil" },
  "Stand": { famille: FAMILLES.PERIPHERIQUES, categorie: "Accessoires Moniteurs", sousCategorie: "Supports & Bras Articulés pour Écrans" },
  "Support ecran": { famille: FAMILLES.PERIPHERIQUES, categorie: "Accessoires Moniteurs", sousCategorie: "Supports & Bras Articulés pour Écrans" },
  "Camera": { famille: FAMILLES.PERIPHERIQUES, categorie: "Audio & Vidéo Professionnelle", sousCategorie: "Systèmes de Visioconférence & Caméras" },
  "WEBCAMS ET VISIOCONFÉRENCE": { famille: FAMILLES.PERIPHERIQUES, categorie: "Audio & Vidéo Professionnelle", sousCategorie: "Systèmes de Visioconférence & Caméras" },
  "ÉQUIPEMENTS DE VIDÉOCONFÉRENCE": { famille: FAMILLES.PERIPHERIQUES, categorie: "Audio & Vidéo Professionnelle", sousCategorie: "Systèmes de Visioconférence & Caméras" },
  "Dongle": { famille: FAMILLES.PERIPHERIQUES, categorie: "Adaptateurs & Convertisseurs", sousCategorie: "Adaptateurs Réseau USB & Convertisseurs" },
  "ACCESSOIRES ET ÉQUIPEMENTS DE MONTAGE": { famille: FAMILLES.PERIPHERIQUES, categorie: "Adaptateurs & Convertisseurs", sousCategorie: "Adaptateurs Réseau USB & Convertisseurs" },
  // ─── ÉLECTRICITÉ & ALIMENTATION ───
  "chargeur": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur Pc portable": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur PC Portable": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Adapter": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Adaptateur": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur LENOVO": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur DELL": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Chargeur HP": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "CHARGEURS PC PORTABLE": { famille: FAMILLES.ALIMENTATION, categorie: "Chargeurs & Alimentation Externe", sousCategorie: "Chargeurs Embout Propriétaire (Jack / Slim Tip)" },
  "Câble d'alimentation": { famille: FAMILLES.PERIPHERIQUES, categorie: "Câbles & Connectique", sousCategorie: "Câbles USB, Vidéo & Alimentation" },
  "Cable Display": { famille: FAMILLES.PERIPHERIQUES, categorie: "Câbles & Connectique", sousCategorie: "Câbles USB, Vidéo & Alimentation" },
  "Câbles USB, Vidéo, Réseau": { famille: FAMILLES.PERIPHERIQUES, categorie: "Câbles & Connectique", sousCategorie: "Câbles USB, Vidéo & Alimentation" },
  "Cable": { famille: FAMILLES.PERIPHERIQUES, categorie: "Câbles & Connectique", sousCategorie: "Câbles USB, Vidéo & Alimentation" },
  "UPS": { famille: FAMILLES.ALIMENTATION, categorie: "Protection Électrique & Onduleurs", sousCategorie: "Onduleurs (UPS) Tour & Rack" },
  "ONDULEURS": { famille: FAMILLES.ALIMENTATION, categorie: "Protection Électrique & Onduleurs", sousCategorie: "Onduleurs (UPS) Tour & Rack" },
  "ONDULEURS ET PROTECTION ÉLECTRIQUE (UPS)": { famille: FAMILLES.ALIMENTATION, categorie: "Protection Électrique & Onduleurs", sousCategorie: "Onduleurs (UPS) Tour & Rack" },
  // ─── IMPRESSION & CONSOMMABLES ───
  "Imprimantes & Scanners": { famille: FAMILLES.IMPRESSION, categorie: "Imprimantes & Scanners", sousCategorie: "Imprimantes Laser & Multifonctions" },
  "Imprimante": { famille: FAMILLES.IMPRESSION, categorie: "Imprimantes & Scanners", sousCategorie: "Imprimantes Laser & Multifonctions" },
  "TONER": { famille: FAMILLES.IMPRESSION, categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "Consommables & Cartouches": { famille: FAMILLES.IMPRESSION, categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "HP - TONERS(CONSOMMABLES D'IMPRESSION)": { famille: FAMILLES.IMPRESSION, categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "AUTRES COMPATIBLES(CONSOMMABLES D'IMPRESSION)": { famille: FAMILLES.IMPRESSION, categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "CANON / KYOCERA(CONSOMMABLES D'IMPRESSION)": { famille: FAMILLES.IMPRESSION, categorie: "Consommables d'Impression", sousCategorie: "Toners & Tambours Laser" },
  "EPSON - ENCRES(CONSOMMABLES D'IMPRESSION)": { famille: FAMILLES.IMPRESSION, categorie: "Consommables d'Impression", sousCategorie: "Cartouches d'Encre" },
  // ─── RÉSEAU ACTIF & COMMUTATION ───
  "switch": { famille: FAMILLES.RESEAU, categorie: "Commutateurs & Routage", sousCategorie: "Switches Réseau (Manageables / PoE)" },
  "Switches": { famille: FAMILLES.RESEAU, categorie: "Commutateurs & Routage", sousCategorie: "Switches Réseau (Manageables / PoE)" },
  "Réseau & POS": { famille: FAMILLES.RESEAU, categorie: "Commutateurs & Routage", sousCategorie: "Switches Réseau (Manageables / PoE)" },
  "RESEAU-SWITCHES": { famille: FAMILLES.RESEAU, categorie: "Commutateurs & Routage", sousCategorie: "Switches Réseau (Manageables / PoE)" },
  "PDU": { famille: FAMILLES.SERVEURS, categorie: "Accessoires Châssis & Baies", sousCategorie: "Rails, PDU & Gestion des Câbles" },
  "Cable management": { famille: FAMILLES.SERVEURS, categorie: "Accessoires Châssis & Baies", sousCategorie: "Rails, PDU & Gestion des Câbles" },
  "PDU & ACCESSOIRES RACK": { famille: FAMILLES.SERVEURS, categorie: "Accessoires Châssis & Baies", sousCategorie: "Rails, PDU & Gestion des Câbles" },
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
          // Résoudre le nom de la feuille depuis le nœud Categorie en base
          const noeudFeuille = await prisma.categorie.findUnique({
            where: { id: catId },
            select: { nom: true },
          });
          const nomCategorie = noeudFeuille?.nom || cible.sousCategorie || cible.categorie;
          await prisma.produit.update({
            where: { id: p.id },
            data: { categorie_id: catId, categorie: nomCategorie },
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
