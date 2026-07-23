import type { Prisma } from "@prisma/client";
import { validerPhoto } from "@/lib/images";
import { MAX_PHOTOS_PRODUIT } from "@/lib/validation";

type Tx = Prisma.TransactionClient;

const RE_COUVERTURE = /^\/api\/produits\/(\d+)\/image$/;
const RE_SUPP = /^\/api\/produits\/(\d+)\/images\/(\d+)$/;

// En édition, la galerie renvoyée par le client mélange des photos existantes
// (URL servies par l'app) et de nouvelles (data-URL). On reconvertit ici les URL
// servies vers leur data-URL d'origine afin de valider et réenregistrer l'ensemble.
export async function resoudreGalerie(
  db: Tx,
  entrees: string[]
): Promise<{ images: string[]; erreur?: undefined } | { erreur: string; images?: undefined }> {
  const resolues: string[] = [];
  for (const brut of entrees) {
    const e = typeof brut === "string" ? brut.trim() : "";
    if (!e) continue;

    const mCouv = RE_COUVERTURE.exec(e);
    if (mCouv) {
      const p = await db.produit.findUnique({
        where: { id: Number(mCouv[1]) },
        select: { image_url: true },
      });
      if (!p?.image_url) return { erreur: "Photo de couverture introuvable." };
      resolues.push(p.image_url);
      continue;
    }

    const mSupp = RE_SUPP.exec(e);
    if (mSupp) {
      const img = await db.produitImage.findUnique({
        where: { id: Number(mSupp[2]) },
        select: { data: true },
      });
      if (!img?.data) return { erreur: "Photo introuvable." };
      resolues.push(img.data);
      continue;
    }

    // Sinon : data-URL (nouvelle photo) ou URL distante → validation directe.
    const souci = validerPhoto(e);
    if (souci) return { erreur: souci };
    resolues.push(e);
  }

  if (resolues.length > MAX_PHOTOS_PRODUIT) {
    return { erreur: `${MAX_PHOTOS_PRODUIT} photos maximum par produit.` };
  }
  return { images: resolues };
}

// La couverture d'un produit vit dans `produit.image_url`. Les photos
// supplémentaires (galerie) sont stockées dans la table `produit_images`.
// `extras` correspond donc à images[1..] : la couverture est gérée à part.

/** Enregistre les photos supplémentaires (galerie) d'un produit. */
export async function creerImagesSupplementaires(
  tx: Tx,
  produitId: number,
  extras: string[]
): Promise<void> {
  if (extras.length === 0) return;
  await tx.produitImage.createMany({
    data: extras.map((data, i) => ({ produit_id: produitId, data, position: i + 1 })),
  });
}

/** Remplace intégralement la galerie supplémentaire d'un produit. */
export async function remplacerImagesSupplementaires(
  tx: Tx,
  produitId: number,
  extras: string[]
): Promise<void> {
  await tx.produitImage.deleteMany({ where: { produit_id: produitId } });
  await creerImagesSupplementaires(tx, produitId, extras);
}
