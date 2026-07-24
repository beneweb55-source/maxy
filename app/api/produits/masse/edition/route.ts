import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { validerLignesProduits, MAX_QUANTITE_PRODUITS } from "@/lib/validation";
import { remplacerImagesSupplementaires, resoudreGalerie } from "@/lib/produit-images-db";
import { creerProduitsGroupes } from "@/lib/creation-produits";

export async function PUT(request: NextRequest) {
  const acces = await exigerUtilisateur(["technicien", "gerant", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { ids, reference, categorie, prix_achat, image_url, images, quantite, prix_vente_fixe, a_jeter } = (corps ?? {}) as {
    ids?: unknown;
    reference?: unknown;
    categorie?: unknown;
    prix_achat?: unknown;
    image_url?: unknown;
    images?: unknown;
    quantite?: unknown;
    prix_vente_fixe?: unknown;
    a_jeter?: unknown;
  };

  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => Number.isInteger(Number(id)))) {
    return erreur(400, "Liste d'identifiants invalide.");
  }
  const produitIds = ids.map(Number);
  
  let targetQuantite = produitIds.length;
  if (quantite !== undefined) {
    const q = Number(quantite);
    if (!Number.isInteger(q) || q < 1) {
      return erreur(400, "Quantité invalide.");
    }
    targetQuantite = Math.min(MAX_QUANTITE_PRODUITS, q);
  }

  const validation = validerLignesProduits([{ reference, categorie, prix_achat }]);
  if (validation.erreur !== undefined) return erreur(400, validation.erreur);
  const ligne = validation.produits[0];
  if (!ligne) return erreur(400, "Données invalides.");

  // Photos fournies explicitement (soit `images`, soit `image_url` en héritage) ?
  const imagesFournies = "images" in (corps as object) || "image_url" in (corps as object);
  let couvertureFournie: string | null = null;
  let extrasFournis: string[] = [];
  if (imagesFournies) {
    const brutes = Array.isArray(images)
      ? (images as string[])
      : typeof image_url === "string" && image_url.trim()
        ? [image_url.trim()]
        : [];
    const resolution = await resoudreGalerie(prisma, brutes);
    if (resolution.erreur !== undefined) return erreur(400, resolution.erreur);
    couvertureFournie = resolution.images[0] ?? null;
    extrasFournis = resolution.images.slice(1);
  }

  try {
    const produits = await prisma.produit.findMany({
      where: { id: { in: produitIds } },
      include: { images: { orderBy: { position: "asc" }, select: { data: true } } },
    });
    if (produits.length !== produitIds.length) {
      return erreur(404, "Certains produits sont introuvables.");
    }

    if (produits.some(p => p.statut === "vendu")) {
      return erreur(400, "Un ou plusieurs produits sont déjà vendus et ne peuvent être modifiés.");
    }

    const donnees: Record<string, unknown> = {};
    if (ligne.reference) donnees.reference = ligne.reference;
    if (ligne.categorie) donnees.categorie = ligne.categorie;
    if (ligne.prix_achat !== undefined) donnees.prix_achat = ligne.prix_achat;

    if (imagesFournies) donnees.image_url = couvertureFournie;

    if (a_jeter !== undefined) {
      if (typeof a_jeter !== "boolean") {
        return erreur(400, "Le champ « à jeter » doit être vrai ou faux.");
      }
      if (a_jeter === true && produits.some((p) => p.statut !== "hs")) {
        return erreur(400, "« À jeter » ne concerne que les produits HS.");
      }
      donnees.a_jeter = a_jeter;
    }

    let modifPrixVente = false;
    if (prix_vente_fixe !== undefined) {
      if (prix_vente_fixe === null || prix_vente_fixe === "") {
        donnees.prix_vente_fixe = null;
        modifPrixVente = true;
      } else {
        const p = Number(prix_vente_fixe);
        if (!Number.isInteger(p) || p < 0) {
          return erreur(400, "Le prix de vente doit être un entier positif en DA.");
        }
        donnees.prix_vente_fixe = p;
        modifPrixVente = true;
      }
    }

    const diff = targetQuantite - produitIds.length;

    await prisma.$transaction(async (tx) => {
      const idsAUpdate = [...produitIds];

      // Suppression de l'excédent si la quantité est réduite
      if (diff < 0) {
        const nbASupprimer = -diff;
        const idsASupprimer = idsAUpdate.splice(-nbASupprimer, nbASupprimer);

        await tx.produitImage.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.reparation.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.historiqueStatut.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.vente.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.mouvementCaisse.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
        await tx.produit.deleteMany({ where: { id: { in: idsASupprimer } } });
      }

      // Mise à jour des produits existants restants
      if (idsAUpdate.length > 0) {
        await tx.produit.updateMany({
          where: { id: { in: idsAUpdate } },
          data: donnees,
        });

        // Si modification de prix de vente sur des produits "ok", ils passent "en_vente"
        if (modifPrixVente && donnees.prix_vente_fixe !== null) {
          const produitsOk = produits.filter(p => p.statut === "ok" && idsAUpdate.includes(p.id));
          if (produitsOk.length > 0) {
            await tx.produit.updateMany({
              where: { id: { in: produitsOk.map(p => p.id) } },
              data: { statut: "en_vente" },
            });
            await tx.historiqueStatut.createMany({
              data: produitsOk.map(p => ({
                produit_id: p.id,
                user_id: user.id,
                statut_avant: "ok",
                statut_apres: "en_vente",
                note: "Prix fixé depuis l'inventaire (masse)",
              })),
            });
          }
        }
        // Si des photos sont fournies, on remplace la galerie de chaque produit.
        if (imagesFournies) {
          for (const pid of idsAUpdate) {
            await remplacerImagesSupplementaires(tx, pid, extrasFournis);
          }
        }
      }

      // Ajout des nouveaux produits si la quantité est augmentée
      if (diff > 0) {
        const originalProduct = produits[0];
        if (!originalProduct) throw new Error("Produit original manquant");
        // Galerie des nouvelles unités : celle fournie, sinon copie de l'original.
        const couvertureNouvelle = imagesFournies ? couvertureFournie : originalProduct.image_url;
        const extrasNouveaux = imagesFournies
          ? extrasFournis
          : originalProduct.images.map((img) => img.data);
        const modeleLigne = {
          reference: ligne.reference,
          categorie: ligne.categorie,
          prix_achat: ligne.prix_achat,
          image_url: couvertureNouvelle ?? undefined,
          images: [...(couvertureNouvelle ? [couvertureNouvelle] : []), ...extrasNouveaux],
          ...(donnees.prix_vente_fixe !== undefined ? { prix_vente_fixe: donnees.prix_vente_fixe as number | null } : {}),
        };
        await creerProduitsGroupes(tx, {
          lotId: originalProduct.lot_id,
          lignes: Array.from({ length: diff }, () => modeleLigne),
          userId: user.id,
          statut: originalProduct.statut,
        });
      }
    }, { timeout: 120000 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PUT /api/produits/masse/edition", e);
    return erreur(500, "Erreur lors de la modification en masse.");
  }
}
