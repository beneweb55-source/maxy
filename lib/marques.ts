/**
 * Liste unifiée des marques par catégorie.
 * Source unique de vérité pour tous les formulaires de création de produits/modèles.
 */

export const MARQUES_PAR_CATEGORIE: Record<string, string[]> = {
  // Ordinateurs
  ordinateurs: ["Lenovo", "HP", "Dell", "Apple", "Asus", "Acer"],
  laptops: ["Lenovo", "HP", "Dell", "Apple", "Asus", "Acer"],
  pc_portable: ["Lenovo", "HP", "Dell", "Apple", "Asus", "Acer"],
  pc_bureau: ["Lenovo", "HP", "Dell", "Asus", "Acer", "Apple"],
  // Composants
  composants: ["Intel", "AMD", "NVIDIA", "Kingston", "Crucial", "Samsung", "Western Digital", "Seagate"],
  processeurs: ["Intel", "AMD"],
  cartes_graphiques: ["NVIDIA", "AMD"],
  memoire: ["Kingston", "Crucial", "Corsair", "G.Skill"],
  // Stockage
  stockage: ["Samsung", "Kingston", "Crucial", "Western Digital", "Seagate", "SanDisk"],
  ssd: ["Samsung", "Kingston", "Crucial", "Western Digital", "SanDisk"],
  disques_durs: ["Western Digital", "Seagate", "Toshiba"],
  // Périphériques
  peripheriques: ["Logitech", "Epson", "Canon", "Brother", "Zebra", "AURES"],
  impressions: ["Epson", "Canon", "Brother", "Zebra", "HP"],
  // Réseau
  reseau: ["Cisco", "Mikrotik", "Ubiquiti", "TP-Link", "D-Link"],
  // Alimentation
  alimentations: ["Corsair", "Seasonic", "EVGA", "Be Quiet", "Cooler Master"],
  // Écrans
  ecrans: ["Dell", "LG", "Samsung", "HP", "BenQ", "Asus"],
};

/**
 * Récupère les marques pour une catégorie donnée.
 * Si la catégorie n'est pas trouvée, retourne les marques "ordinatesurs" par défaut.
 */
export function getMarquesPourCategorie(categorie: string): string[] {
  const catLower = categorie.toLowerCase().trim();

  // Recherche exacte
  for (const [cle, marques] of Object.entries(MARQUES_PAR_CATEGORIE)) {
    if (cle.toLowerCase() === catLower) return marques;
  }

  // Recherche partielle (la catégorie contient un mot-clé)
  for (const [cle, marques] of Object.entries(MARQUES_PAR_CATEGORIE)) {
    if (catLower.includes(cle.toLowerCase()) || cle.toLowerCase().includes(catLower)) {
      return marques;
    }
  }

  // Par défaut : marques d'ordinateurs
  return MARQUES_PAR_CATEGORIE["ordinateurs"] || [];
}

/**
 * Liste plate de toutes les marques (sans doublons).
 */
export function toutesLesMarques(): string[] {
  const ensemble = new Set<string>();
  for (const marques of Object.values(MARQUES_PAR_CATEGORIE)) {
    for (const m of marques) {
      ensemble.add(m);
    }
  }
  return [...ensemble].sort();
}
