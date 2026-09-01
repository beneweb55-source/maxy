import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { urlPhotoProduit, urlPhotoSupplementaire } from "@/lib/images";
import { couverturesProduits, urlCouverture } from "@/lib/images-flags";

const JOUR_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const produits = await prisma.produit.findMany({
      where: { statut: "en_vente" },
      orderBy: { id: "asc" },
      // `select` explicite : pas de photo base64 dans une liste.
      select: {
        id: true,
        code_interne: true,
        reference: true,
        categorie: true,
        prix_achat: true,
        prix_vente_fixe: true,
        numero_serie: true,
        etiquette_imprimee: true,
        created_at: true,
        lot: { select: { date_entree: true } },
        reparations: { select: { cout: true } },
        images: { orderBy: { position: "asc" }, select: { id: true } },
        historique: {
          where: { statut_apres: "en_vente" },
          orderBy: { created_at: "desc" },
          take: 1,
          select: { created_at: true },
        },
      },
    });
    const avecCouverture = await couverturesProduits(produits.map((p) => p.id));
    const maintenant = Date.now();
    return NextResponse.json({
      produits: produits.map((p) => {
        const coutRep = p.reparations.reduce((s, r) => s + r.cout, 0);
        const depuis = p.historique.at(0)?.created_at ?? p.lot?.date_entree ?? p.created_at;
        return {
          id: p.id,
          code_interne: p.code_interne,
          reference: p.reference,
          categorie: p.categorie,
          prix_achat: p.prix_achat,
          cout_reparations: coutRep,
          prix_vente_fixe: p.prix_vente_fixe,
          numero_serie: p.numero_serie,
          etiquette_imprimee: p.etiquette_imprimee,
          marge_prevue: (p.prix_vente_fixe ?? 0) - p.prix_achat - coutRep,
          jours_en_vente: Math.floor((maintenant - depuis.getTime()) / JOUR_MS),
          image_url: urlCouverture(avecCouverture.get(p.id), p.id),
          // Galerie complète (couverture d'abord) pour l'aperçu plein écran.
          images: [
            ...(urlCouverture(avecCouverture.get(p.id), p.id)
              ? [urlCouverture(avecCouverture.get(p.id), p.id)!]
              : []),
            ...p.images.map((img) => urlPhotoSupplementaire(p.id, img.id)),
          ],
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/ventes/en-vente", e);
    return erreur(500, "Erreur lors du chargement des produits en vente.");
  }
}
