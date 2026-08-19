import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import {
  urlPhotoProduit,
  urlPhotoSupplementaire,
  validerPhoto,
} from "@/lib/images";
import { remplacerImagesSupplementaires, resoudreGalerie } from "@/lib/produit-images-db";
import {
  couvertureProduit,
  galerieProduit,
  urlCouverture,
  urlGalerie,
} from "@/lib/images-flags";
import { televerserPhotos } from "@/lib/stockage-images";

const JOUR_MS = 24 * 60 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  try {
    // `select` explicite : la fiche affiche les photos via leurs URL, jamais via
    // la donnée base64 — inutile de la transférer depuis la base.
    const p = await prisma.produit.findUnique({
      where: { id: produitId },
      select: {
        id: true,
        code_interne: true,
        reference: true,
        categorie: true,
        statut: true,
        a_jeter: true,
        en_vitrine: true,
        notes: true,
        decision_rapport: true,
        prix_achat: true,
        prix_vente_fixe: true,
        prix_vente_reel: true,
        date_vente: true,
        created_at: true,
        lot: { select: { id: true, fournisseur: true, date_entree: true, statut_lot: true } },
        reparations: {
          orderBy: { date: "asc" },
          select: {
            id: true,
            cout: true,
            description: true,
            date: true,
            user: { select: { username: true } },
          },
        },
        historique: {
          orderBy: { created_at: "asc" },
          select: {
            id: true,
            statut_avant: true,
            statut_apres: true,
            note: true,
            created_at: true,
            user: { select: { username: true } },
          },
        },
        ventes: {
          orderBy: { date_vente: "asc" },
          select: {
            id: true,
            prix_vente_reel: true,
            canal: true,
            date_vente: true,
            annulee: true,
            motif_annulation: true,
            vendeur: { select: { username: true } },
          },
        },
        images: { orderBy: { position: "asc" }, select: { id: true } },
      },
    });
    if (!p) return erreur(404, "Produit introuvable.");

    // Couverture et galerie : URL publiques du CDN si les photos sont
    // hébergées, sinon routes proxy — jamais de base64 transféré ici.
    const [infoCouverture, photosGalerie] = await Promise.all([
      couvertureProduit(p.id),
      galerieProduit(p.id),
    ]);
    const urlCouvertureProduit = urlCouverture(infoCouverture, p.id);

    // Galerie complète : la couverture d'abord, puis les photos supplémentaires.
    const galerie: string[] = [
      ...(urlCouvertureProduit ? [urlCouvertureProduit] : []),
      ...photosGalerie.map((img) => urlGalerie(img, p.id)),
    ];

    const coutReparations = p.reparations.reduce((s, r) => s + r.cout, 0);
    
    // Pour permettre l'édition de la quantité globale du modèle depuis la fiche :
    const produitsIdentiques = p.lot !== null 
      ? await prisma.produit.findMany({
          where: {
            lot_id: p.lot.id,
            reference: p.reference,
            categorie: p.categorie,
          },
          select: { id: true }
        })
      : [{ id: p.id }];
    const ids_modele = produitsIdentiques.map(pi => pi.id);

    return NextResponse.json({
      id: p.id,
      code_interne: p.code_interne,
      reference: p.reference,
      categorie: p.categorie,
      statut: p.statut,
      a_jeter: p.a_jeter,
      en_vitrine: p.en_vitrine,
      notes: p.notes,
      image_url: urlCouvertureProduit,
      images: galerie,
      decision_rapport: p.decision_rapport,
      ids_modele,
      quantite: ids_modele.length,
      prix_achat: p.prix_achat,
      cout_reparations: coutReparations,
      prix_vente_fixe: p.prix_vente_fixe,
      prix_vente_reel: p.prix_vente_reel,
      date_vente: p.date_vente ? p.date_vente.toISOString() : null,
      marge:
        p.prix_vente_reel !== null
          ? p.prix_vente_reel - p.prix_achat - coutReparations
          : null,
      jours_stock: Math.floor(
        (Date.now() - (p.lot?.date_entree ?? p.created_at).getTime()) / JOUR_MS
      ),
      date_entree: (p.lot?.date_entree ?? p.created_at).toISOString(),
      lot: p.lot
        ? {
            id: p.lot.id,
            fournisseur: p.lot.fournisseur,
            date_entree: p.lot.date_entree.toISOString(),
            statut_lot: p.lot.statut_lot,
          }
        : null,
      reparations: p.reparations.map((r) => ({
        id: r.id,
        cout: r.cout,
        description: r.description,
        date: r.date.toISOString(),
        par: r.user.username,
      })),
      historique: p.historique.map((h) => ({
        id: h.id,
        statut_avant: h.statut_avant,
        statut_apres: h.statut_apres,
        note: h.note,
        quand: h.created_at.toISOString(),
        par: h.user.username,
      })),
      ventes: p.ventes.map((v) => ({
        id: v.id,
        prix_vente_reel: v.prix_vente_reel,
        canal: v.canal,
        date_vente: v.date_vente.toISOString(),
        vendeur: v.vendeur.username,
        annulee: v.annulee,
        motif_annulation: v.motif_annulation,
      })),
    });
  } catch (e) {
    console.error("GET /api/produits/[id]", e);
    return erreur(500, "Erreur lors du chargement du produit.");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { reference, categorie, prix_achat, image_url, images, prix_vente_fixe, a_jeter, en_vitrine } =
    (corps ?? {}) as {
      reference?: unknown;
      categorie?: unknown;
      prix_achat?: unknown;
      image_url?: unknown;
      images?: unknown;
      prix_vente_fixe?: unknown;
      a_jeter?: unknown;
      en_vitrine?: unknown;
    };

  const donnees: {
    reference?: string;
    categorie?: string;
    prix_achat?: number;
    image_url?: string | null;
    prix_vente_fixe?: number | null;
    a_jeter?: boolean;
    en_vitrine?: boolean;
    statut?: any;
  } = {};
  if (reference !== undefined) {
    if (typeof reference !== "string" || !reference.trim()) {
      return erreur(400, "La référence est obligatoire.");
    }
    donnees.reference = reference.trim();
  }
  if (categorie !== undefined) {
    if (typeof categorie !== "string" || !categorie.trim()) {
      return erreur(400, "La catégorie est obligatoire.");
    }
    donnees.categorie = categorie.trim();
  }
  if (prix_achat !== undefined) {
    if (typeof prix_achat !== "number" || !Number.isInteger(prix_achat) || prix_achat < 0) {
      return erreur(400, "Le prix d'achat doit être un entier positif en DA.");
    }
    donnees.prix_achat = prix_achat;
  }
  if (image_url !== undefined) {
    if (image_url === null || (typeof image_url === "string" && !image_url.trim())) {
      donnees.image_url = null;
    } else if (typeof image_url === "string") {
      const soucisPhoto = validerPhoto(image_url.trim());
      if (soucisPhoto) return erreur(400, soucisPhoto);
      donnees.image_url = (await televerserPhotos([image_url.trim()]))[0] ?? null;
    } else {
      return erreur(400, "Photo invalide.");
    }
  }

  // Galerie multi-photos : `images[0]` devient la couverture, le reste la galerie.
  // Le client peut renvoyer un mélange d'URL existantes et de data-URL nouvelles.
  let extrasARemplacer: string[] | null = null;
  if (images !== undefined) {
    if (!Array.isArray(images)) return erreur(400, "Liste de photos invalide.");
    const resolution = await resoudreGalerie(prisma, images as string[]);
    if (resolution.erreur !== undefined) return erreur(400, resolution.erreur);
    // Les nouvelles photos partent vers le stockage objet ; celles déjà
    // hébergées sont renvoyées telles quelles.
    const stockees = await televerserPhotos(resolution.images);
    donnees.image_url = stockees[0] ?? null;
    extrasARemplacer = stockees.slice(1);
  }

  if (en_vitrine !== undefined) {
    if (typeof en_vitrine !== "boolean") {
      return erreur(400, "Le champ « en vitrine » doit être vrai ou faux.");
    }
    donnees.en_vitrine = en_vitrine;
  }

  if (a_jeter !== undefined) {
    if (typeof a_jeter !== "boolean") {
      return erreur(400, "Le champ « à jeter » doit être vrai ou faux.");
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

  if (Object.keys(donnees).length === 0) {
    return erreur(400, "Aucune modification fournie.");
  }

  try {
    const produit = await prisma.produit.findUnique({ where: { id: produitId } });
    if (!produit) return erreur(404, "Produit introuvable.");
    if (donnees.a_jeter === true && produit.statut !== "hs") {
      return erreur(400, "« À jeter » ne concerne que les produits HS.");
    }
    if (donnees.en_vitrine === true && produit.statut === "vendu") {
      return erreur(400, "Un produit vendu ne peut pas être mis en vitrine.");
    }

    const maj = await prisma.$transaction(async (tx) => {
      let produitsIdentiques = [produit];
      
      // Si le produit fait partie d'un lot, on recherche tous les produits identiques
      // (même lot, référence, catégorie) pour leur appliquer les modifications de base (prix, réf, images).
      if (produit.lot_id !== null) {
        produitsIdentiques = await tx.produit.findMany({
          where: {
            lot_id: produit.lot_id,
            reference: produit.reference,
            categorie: produit.categorie,
          }
        });
      }

      // Séparer les données qui s'appliquent à tous les produits identiques
      // de celles qui ne s'appliquent qu'à l'unité spécifique (vitrine, a_jeter).
      const donneesCommunes: any = {};
      if (donnees.reference !== undefined) donneesCommunes.reference = donnees.reference;
      if (donnees.categorie !== undefined) donneesCommunes.categorie = donnees.categorie;
      if (donnees.prix_achat !== undefined) donneesCommunes.prix_achat = donnees.prix_achat;
      if (modifPrixVente) donneesCommunes.prix_vente_fixe = donnees.prix_vente_fixe;
      if (donnees.image_url !== undefined) donneesCommunes.image_url = donnees.image_url;

      const donneesUnite: any = { ...donneesCommunes };
      if (donnees.en_vitrine !== undefined) donneesUnite.en_vitrine = donnees.en_vitrine;
      if (donnees.a_jeter !== undefined) donneesUnite.a_jeter = donnees.a_jeter;

      let m;

      for (const p of produitsIdentiques) {
        if (p.id === produitId) {
          // Produit ciblé explicitement
          const d = { ...donneesUnite };
          if (modifPrixVente && donnees.prix_vente_fixe !== null && p.statut === "ok") {
            d.statut = "en_vente";
            await tx.historiqueStatut.create({
              data: {
                produit_id: p.id,
                user_id: user.id,
                statut_avant: "ok",
                statut_apres: "en_vente",
                note: "Prix fixé depuis l'inventaire",
              },
            });
          }
          m = await tx.produit.update({ where: { id: p.id }, data: d });
          if (extrasARemplacer !== null) {
            await remplacerImagesSupplementaires(tx, p.id, extrasARemplacer);
          }
        } else {
          // Autres produits identiques du même lot (on exclut les vendus pour les prix de vente)
          if (p.statut === "vendu" && modifPrixVente) continue;

          const d = { ...donneesCommunes };
          if (modifPrixVente && donnees.prix_vente_fixe !== null && p.statut === "ok") {
            d.statut = "en_vente";
            await tx.historiqueStatut.create({
              data: {
                produit_id: p.id,
                user_id: user.id,
                statut_avant: "ok",
                statut_apres: "en_vente",
                note: "Prix fixé en cascade (produits identiques du lot)",
              },
            });
          }
          if (Object.keys(d).length > 0) {
             await tx.produit.update({ where: { id: p.id }, data: d });
             if (extrasARemplacer !== null) {
               await remplacerImagesSupplementaires(tx, p.id, extrasARemplacer);
             }
          }
        }
      }

      return m!;
    });

    return NextResponse.json({
      ok: true,
      id: maj.id,
      reference: maj.reference,
      categorie: maj.categorie,
      prix_achat: maj.prix_achat,
    });
  } catch (e) {
    console.error("PUT /api/produits/[id]", e);
    return erreur(500, "Erreur lors de la modification du produit.");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  const { id } = await params;
  const produitId = Number(id);
  if (!Number.isInteger(produitId)) return erreur(400, "Identifiant de produit invalide.");

  try {
    const produit = await prisma.produit.findUnique({
      where: { id: produitId },
      include: {
        _count: { select: { ventes: true, mouvements: true } },
      },
    });
    if (!produit) return erreur(404, "Produit introuvable.");
    await prisma.$transaction([
      prisma.produitImage.deleteMany({ where: { produit_id: produitId } }),
      prisma.historiqueStatut.deleteMany({ where: { produit_id: produitId } }),
      prisma.reparation.deleteMany({ where: { produit_id: produitId } }),
      prisma.vente.deleteMany({ where: { produit_id: produitId } }),
      prisma.mouvementCaisse.deleteMany({ where: { produit_id: produitId } }),
      prisma.produit.delete({ where: { id: produitId } }),
    ]);

    return NextResponse.json({ ok: true, supprime: produit.code_interne });
  } catch (e) {
    console.error("DELETE /api/produits/[id]", e);
    return erreur(500, "Erreur lors de la suppression du produit.");
  }
}
