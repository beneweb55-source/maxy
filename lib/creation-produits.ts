import type { Prisma, StatutProduit } from "@prisma/client";
import type { LigneProduitEntree } from "@/lib/validation";
import { genererCodesInternes } from "@/lib/codes";

type Tx = Prisma.TransactionClient;

// Insère des produits par PAQUETS plutôt qu'un par un. Créer chaque produit
// individuellement (create + historique + images) multiplie les allers-retours
// vers la base : au-delà de ~50 produits, la fonction serverless dépasse son
// délai maximum et l'ajout échoue. `createManyAndReturn` insère tout un paquet
// en une seule requête. La taille de paquet est réduite quand des photos sont
// jointes, pour éviter une requête SQL surdimensionnée.
export async function creerProduitsGroupes(
  tx: Tx,
  options: {
    lotId: number;
    lignes: LigneProduitEntree[];
    userId: number;
    statut?: StatutProduit;
  }
): Promise<string[]> {
  const { lotId, lignes, userId, statut = "recu" } = options;
  if (lignes.length === 0) return [];

  const codes = await genererCodesInternes(tx, lignes.length);

  const aDesImages = lignes.some((l) => l.images.length > 0);
  const TAILLE_PAQUET = aDesImages ? 10 : 200;

  for (let debut = 0; debut < lignes.length; debut += TAILLE_PAQUET) {
    const tranche = lignes.slice(debut, debut + TAILLE_PAQUET);
    const codesTranche = codes.slice(debut, debut + TAILLE_PAQUET);

    const crees = await tx.produit.createManyAndReturn({
      data: tranche.map((ligne, i) => ({
        lot_id: lotId,
        code_interne: codesTranche[i]!,
        reference: ligne.reference,
        categorie: ligne.categorie,
        prix_achat: ligne.prix_achat,
        image_url: ligne.images[0] ?? null,
        statut,
      })),
      select: { id: true, code_interne: true },
    });
    // On relie par code_interne (unique) plutôt que par l'ordre de retour, non
    // garanti par Prisma.
    const idParCode = new Map(crees.map((p) => [p.code_interne, p.id]));

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

  return codes;
}
