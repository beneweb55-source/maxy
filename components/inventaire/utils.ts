import type { StatutProduit } from "@prisma/client";
import type { LigneProduit, GroupeProduits } from "./types";

/** Formate le chemin complet d'une catégorie (Famille > Catégorie > Sous-catégorie). */
export function formatCategoriePath(p: LigneProduit): string {
  if (p.categorie_rel) {
    const parts: string[] = [];
    if (p.categorie_rel.parent?.parent?.nom) parts.push(p.categorie_rel.parent.parent.nom);
    if (p.categorie_rel.parent?.nom) parts.push(p.categorie_rel.parent.nom);
    parts.push(p.categorie_rel.nom);
    return parts.join(" > ");
  }
  return p.categorie || "Non classé";
}

/** Prix de vente affiché pour une unité : le prix réel si elle est vendue, sinon le prix fixé. */
export function prixVenteAffiche(p: LigneProduit): number | null {
  if (p.statut === "vendu" && p.prix_vente_reel !== null) return p.prix_vente_reel;
  return p.prix_vente_fixe;
}

/** Regroupe les produits identiques (même référence + catégorie ou même modèle) en familles d'affichage. */
export function grouperDoublons(produits: LigneProduit[], statutsActifs?: StatutProduit[]): GroupeProduits[] {
  const statutsExclus: readonly StatutProduit[] = (statutsActifs && statutsActifs.length > 0)
    ? (["vendu", "hs", "assemble"] as StatutProduit[]).filter(s => !statutsActifs.includes(s))
    : ["vendu", "hs", "assemble"];
  const produitsActifs = produits.filter(
    (p) => !statutsExclus.includes(p.statut)
  );
  const groupes = new Map<string, LigneProduit[]>();
  for (const p of produitsActifs) {
    const catFormatee = formatCategoriePath(p);
    const cle = p.modele_id
      ? `mod-${p.modele_id}`
      : `${p.reference.trim().toLowerCase()}|${catFormatee.trim().toLowerCase()}`;
    const existant = groupes.get(cle);
    if (existant) existant.push(p);
    else groupes.set(cle, [p]);
  }
  return Array.from(groupes.entries()).map(([cle, unites]) => {
    const prix = unites.map((u) => u.prix_achat);
    const vente = unites
      .map(prixVenteAffiche)
      .filter((v): v is number => v !== null);
    const parStatut = new Map<StatutProduit, number>();
    for (const u of unites) parStatut.set(u.statut, (parStatut.get(u.statut) ?? 0) + 1);
    const premier = unites[0]!;
    return {
      cle,
      reference: premier.reference,
      categorie: formatCategoriePath(premier),
      modele_id: premier.modele_id || null,
      categorie_id: premier.categorie_id || null,
      image_url: unites.find((u) => u.image_url)?.image_url ?? premier.modele?.image_url ?? null,
      nbImages: Math.max(...unites.map((u) => u.nb_images || 0), 0),
      enVitrine: unites.filter((u) => u.en_vitrine).length,
      unites,
      prixMin: Math.min(...prix),
      prixMax: Math.max(...prix),
      venteMin: vente.length > 0 ? Math.min(...vente) : null,
      venteMax: vente.length > 0 ? Math.max(...vente) : null,
      resumeStatuts: Array.from(parStatut.entries()).map(([statut, n]) => ({ statut, n })),
      totalDisponibles: unites.length,
    };
  });
}
