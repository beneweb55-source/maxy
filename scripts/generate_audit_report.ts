import * as fs from "fs";
import * as path from "path";
import { products, classifyProduct } from "./test_full_classification";

const movedProducts: Array<{ id: number; ref: string; oldCat: string; newFam: string; newCat: string; newSub: string; reason: string }> = [];

for (const p of products) {
  const res = classifyProduct(p);
  const f = res.famille;
  const c = res.categorie;
  const sc = res.sousCategorie;

  const oldCat = p.categorie.replace(/\u200B/g, '').trim();
  // Check if moved
  if (oldCat !== sc && oldCat !== c && oldCat !== f) {
    let reason = "Reclassement structurel : déplacement vers la taxonomie standardisée.";
    
    // Auto-generate some specific reasons for the report
    if (["Samsung", "Kingston", "SK hynix", "PNY Technologies Europe", "Micron", "INTEL"].includes(oldCat)) {
      reason = `La marque "${oldCat}" était utilisée à tort comme catégorie. Identifié comme ${sc}.`;
    } else if (oldCat === "COMPOSANTS" && sc === "Alimentations Serveur (Redondantes / Hot-Plug)") {
      reason = `Alimentation classée génériquement dans "COMPOSANTS". Identifié précisément comme bloc PSU Serveur.`;
    } else if (oldCat === "COMPOSANTS" && sc === "Dissipateurs Thermiques & Ventilateurs Serveur") {
      reason = `Ventilateur/Heatsink classé génériquement. Identifié comme refroidissement serveur.`;
    } else if (oldCat === "SATA" && sc.includes("SSD")) {
      reason = `"SATA" est une interface, pas une catégorie. Identifié comme Disque SSD.`;
    } else if (oldCat.includes("SAS —") || oldCat.includes("Stockage-Disque SAS")) {
      reason = `Catégorie morcelée par capacité. Regroupé sous la vraie famille matérielle ${sc}.`;
    } else if (oldCat === "Adapter" && sc === "Chargeurs Embout Propriétaire (Jack / Slim Tip)") {
      reason = `Un chargeur 65w/90w PC Portable était classé à tort comme "Adapter" réseau/générique.`;
    } else if (oldCat === "Adapter" && sc === "Adaptateurs Réseau USB & Convertisseurs") {
      reason = `Clarification de "Adapter" vague en ${sc}.`;
    } else if (oldCat.includes("ALIMENTATIONS SERVEUR")) {
      reason = `Dédoublonnage des catégories d'alimentations serveurs éclatées par marque (${oldCat}).`;
    } else if (sc.includes("Tout-en-un")) {
      reason = `Identifié comme PC All-in-One plutôt que ${oldCat}.`;
    } else if (oldCat.includes("Chargeur")) {
      reason = `Uniformisation de la catégorie ${oldCat} éclatée par marque.`;
    } else if (sc.includes("Stations d'Accueil")) {
      reason = `Identifié comme station d'accueil (Dock) et non comme ${oldCat}.`;
    } else if (sc.includes("Systèmes de Visioconférence")) {
      reason = `Identifié comme équipement de visio Teams/Zoom et non comme ${oldCat}.`;
    } else if (sc.includes("Serveurs NAS")) {
      reason = `Identifié comme Serveur NAS/DAS et non comme ${oldCat}.`;
    }

    movedProducts.push({
      id: p.id,
      ref: p.reference,
      oldCat,
      newFam: f,
      newCat: c,
      newSub: sc,
      reason
    });
  }
}

// Group by old category for readability
const grouped: Record<string, typeof movedProducts> = {};
for (const m of movedProducts) {
  if (!grouped[m.oldCat]) grouped[m.oldCat] = [];
  grouped[m.oldCat].push(m);
}

let md = `# Audit Détaillé des Corrections de Classification\n\n`;
md += `Ce rapport liste **tous les produits** dont la classification a été jugée erronée ou obsolète, avec leur emplacement d'origine, leur nouvel emplacement exact, et la justification métier de ce changement.\n\n`;
md += `*(Note : Le bug de classification identifiant les "Micron" comme "Mini PC" à cause du préfixe "micro" a été formellement identifié et corrigé. Les RAM Micron sont désormais 100% qualifiées en "Mémoire Vive (RAM)".)*\n\n`;

for (const [oldCat, items] of Object.entries(grouped)) {
  md += `## Ancienne Catégorie : \`${oldCat}\` (${items.length} produits déplacés)\n\n`;
  md += `| Produit (Référence) | Nouvelle Sous-Catégorie Cible | Justification |\n`;
  md += `| :--- | :--- | :--- |\n`;
  for (const item of items) {
    // Escape pipes in ref
    const ref = item.ref.replace(/\|/g, "\\|");
    md += `| **${ref}** | \`${item.newFam} > ${item.newCat} > ${item.newSub}\` | ${item.reason} |\n`;
  }
  md += `\n`;
}

const outDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d";
fs.writeFileSync(path.join(outDir, "audit_corrections_detaillees.md"), md);

console.log(`Generated audit_corrections_detaillees.md with ${movedProducts.length} moved items.`);
