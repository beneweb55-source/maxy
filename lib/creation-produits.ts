import type { Prisma, StatutProduit } from "@prisma/client";
import type { LigneProduitEntree } from "@/lib/validation";
import { genererCodesInternes } from "@/lib/codes";

type Tx = Prisma.TransactionClient;

/** Data needed to set bom_role after the transaction commits. */
export interface BomUpdate {
  produit_id: number;
  bom_role: string;
}

/**
 * Insère des produits par PAQUETS plutôt qu'un par un.
 *
 * Les mises à jour `bom_role` sont retournées en dehors de la transaction pour
 * éviter d'abandonner toute la transaction si la colonne `bom_role` n'existe pas
 * dans la base de production (comportement PostgreSQL : une erreur dans un
 * $transaction abort le bloc entier → 25P02).
 */
export async function creerProduitsGroupes(
  tx: Tx,
  options: {
    lotId: number | null;
    lignes: LigneProduitEntree[];
    userId: number;
    statut?: StatutProduit;
    enVitrine?: boolean;
  }
): Promise<{ codes: string[]; bomUpdates: BomUpdate[] }> {
  const { lotId, lignes, userId, statut = "recu", enVitrine = false } = options;
  if (lignes.length === 0) return { codes: [], bomUpdates: [] };

  const codes = await genererCodesInternes(tx, lignes.length);

  const aDesImages = lignes.some((l) => l.images.length > 0);
  const TAILLE_PAQUET = aDesImages ? 10 : 200;

  const allBomUpdates: BomUpdate[] = [];

  for (let debut = 0; debut < lignes.length; debut += TAILLE_PAQUET) {
    const tranche = lignes.slice(debut, debut + TAILLE_PAQUET);
    const codesTranche = codes.slice(debut, debut + TAILLE_PAQUET);

    const crees = await tx.produit.createManyAndReturn({
      data: tranche.map((ligne, i) => ({
        lot_id: lotId,
        modele_id: ligne.modele_id ?? null,
        categorie_id: ligne.categorie_id ?? null,
        code_interne: codesTranche[i]!,
        reference: ligne.reference,
        categorie: ligne.categorie,
        numero_serie: ligne.numero_serie ?? null,
        grade: ligne.grade ?? null,
        emplacement: ligne.emplacement ?? (enVitrine ? "vitrine" : "reserve"),
        prix_achat: ligne.prix_achat,
        prix_vente_fixe: ligne.prix_vente_fixe ?? null,
        image_url: ligne.images[0] ?? null,
        est_compose: ligne.est_compose ?? false,
        statut,
        en_vitrine: enVitrine,
      })),
      select: { id: true, code_interne: true },
    });
    // On relie par code_interne (unique) plutôt que par l'ordre de retour, non
    // garanti par Prisma.
    const idParCode = new Map(crees.map((p) => [p.code_interne, p.id]));

    // Collect bom_role updates (will be applied AFTER transaction commits)
    tranche.forEach((ligne, i) => {
      const id = idParCode.get(codesTranche[i]!);
      if (id !== undefined && ligne.bom_role) {
        allBomUpdates.push({ produit_id: id, bom_role: ligne.bom_role as string });
      }
    });

    await tx.historiqueStatut.createMany({
      data: crees.map((p) => ({
        produit_id: p.id,
        user_id: userId,
        statut_avant: null,
        statut_apres: statut,
      })),
    });

    const imagesData: { produit_id: number; data: string; position: number }[] = [];
    tranche.forEach((ligne, i) => {
      const id = idParCode.get(codesTranche[i]!);
      if (id === undefined) return;
      ligne.images.slice(1).forEach((data, j) => {
        imagesData.push({ produit_id: id, data, position: j + 1 });
      });
    });
    if (imagesData.length > 0) {
      await tx.produitImage.createMany({ data: imagesData });
    }
  }

  return { codes, bomUpdates: allBomUpdates };
}
