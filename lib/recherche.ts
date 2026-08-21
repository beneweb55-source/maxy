export function normaliserTexte(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .toLowerCase()
    .trim();
}

/**
 * Recherche ultra-rapide et tolérante.
 * 1. Correspondance exacte (priorité haute)
 * 2. Commence par (priorité moyenne)
 * 3. Contient (priorité normale)
 * 4. Fuzzy / mots partiels (priorité basse)
 */
export function rechercheTolérante<T>(
  items: T[],
  recherche: string,
  getChamps: (item: T) => string[]
): T[] {
  if (!recherche.trim()) return items;

  const termesRecherche = normaliserTexte(recherche).split(/\s+/);
  
  const resultats = items.map((item) => {
    const champs = getChamps(item).map(normaliserTexte);
    const champsCombines = champs.join(" ");
    
    let score = 0;
    const rechercheNormale = normaliserTexte(recherche);

    // 1. Exact match sur un champ
    if (champs.some(c => c === rechercheNormale)) {
      score += 100;
    }
    
    // 2. Exact match sur le texte combiné
    if (champsCombines === rechercheNormale) {
      score += 80;
    }

    // 3. Commence par (très courant pour les références ou codes)
    if (champs.some(c => c.startsWith(rechercheNormale))) {
      score += 50;
    }

    // 4. Contient la phrase exacte
    if (champsCombines.includes(rechercheNormale)) {
      score += 30;
    }

    // 5. Mots partiels : tous les termes de recherche doivent être présents (AND)
    const termesPresents = termesRecherche.every(terme => 
      champs.some(c => c.includes(terme))
    );
    
    if (termesPresents) {
      score += 10;
    }

    return { item, score };
  });

  // Ne garder que ceux qui ont un score > 0 et trier par score
  return resultats
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
}
