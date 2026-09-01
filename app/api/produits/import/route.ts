import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { creerProduitsGroupes } from "@/lib/creation-produits";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import type { StatutProduit } from "@prisma/client";

export interface LigneImportApi {
  reference: string;
  categorie_id?: number | null;
  categorie_nom?: string;
  prix_achat?: number | string;
  prix_vente_fixe?: number | string | null;
  quantite?: number | string;
  numero_serie?: string | null;
  grade?: string | null;
  emplacement?: string | null;
  lot_id?: number | string | null;
  en_vitrine?: boolean;
  notes?: string | null;
  attributs?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const body = await request.json();
    const { lignes = [] } = body as { lignes: LigneImportApi[] };

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return erreur(400, "Aucune ligne de produit à importer.");
    }

    if (lignes.length > 5000) {
      return erreur(400, "Le lot dépasse la limite maximale de 5 000 lignes par import.");
    }

    // Récupérer la première catégorie de repli si manquante
    const premiereCategorie = await prisma.categorie.findFirst({
      where: { parent_id: { not: null } },
      orderBy: { id: "asc" }
    }) || await prisma.categorie.findFirst();

    const categorieFallbackId = premiereCategorie?.id || 1;
    const categorieFallbackNom = premiereCategorie?.nom || "Matériel";

    // Exécuter l'import dans une transaction sécurisée
    const resultat = await prisma.$transaction(async (tx) => {
      let modelesCrees = 0;
      let modelesExistants = 0;
      let exemplairesCrees = 0;
      const codesGeneres: string[] = [];

      // Cache en mémoire pour cette session d'import
      const cacheModeles = new Map<string, any>();

      // Grouper les lignes pour optimiser les créations d'exemplaires
      for (const ligne of lignes) {
        if (!ligne.reference || !ligne.reference.trim()) continue;

        const refNettoyee = ligne.reference.trim();
        const catId = ligne.categorie_id ? Number(ligne.categorie_id) : categorieFallbackId;
        const catNom = ligne.categorie_nom || categorieFallbackNom;
        const prixAchatNum = Math.max(0, Number(ligne.prix_achat) || 0);
        const prixVenteNum = ligne.prix_vente_fixe ? Number(ligne.prix_vente_fixe) : null;
        const qty = Math.max(1, Math.min(500, Number(ligne.quantite) || 1));
        const lotIdNum = ligne.lot_id ? Number(ligne.lot_id) : null;
        const gradeVal = ligne.grade || "Grade A";
        const emplacementVal = ligne.en_vitrine ? "vitrine" : (ligne.emplacement || "reserve");
        const snVal = ligne.numero_serie ? String(ligne.numero_serie).trim() : null;

        // 1. Recherche / Upsert Modèle
        const cleCache = `${catId}__${refNettoyee.toLowerCase()}`;
        let modele = cacheModeles.get(cleCache);

        if (!modele) {
          modele = await tx.modele.findFirst({
            where: {
              nom: { equals: refNettoyee, mode: "insensitive" },
              categorie_id: catId,
            }
          });

          if (!modele) {
            modele = await tx.modele.create({
              data: {
                nom: refNettoyee,
                categorie_id: catId,
                attributs: ligne.attributs || {},
                prix_vente_conseille: prixVenteNum,
              }
            });
            modelesCrees++;
          } else {
            modelesExistants++;
          }

          cacheModeles.set(cleCache, modele);
        }

        // 2. Génération des exemplaires physiques
        const lignesExemplaires = Array.from({ length: qty }, (_, i) => ({
          reference: modele.nom,
          categorie: catNom,
          modele_id: modele.id,
          categorie_id: catId,
          numero_serie: i === 0 && snVal ? snVal : null,
          grade: gradeVal,
          emplacement: emplacementVal,
          prix_achat: prixAchatNum,
          prix_vente_fixe: prixVenteNum,
          images: [] as string[],
        }));

        const codes = await creerProduitsGroupes(tx, {
          lotId: lotIdNum,
          lignes: lignesExemplaires,
          userId: user.id,
          statut: (prixVenteNum !== null && prixVenteNum > 0) ? "en_vente" : "recu",
          enVitrine: emplacementVal === "vitrine",
        });

        exemplairesCrees += codes.length;
        codesGeneres.push(...codes);
      }

      return {
        modelesCrees,
        modelesExistants,
        exemplairesCrees,
        codesGeneres,
      };
    }, { timeout: 180000 });

    // Journal d'activité
    await enregistrerActivite(
      prisma,
      user.id,
      ACTIONS_JOURNAL.PRODUIT_AJOUTER,
      "import_masse",
      undefined,
      {
        total_lignes: lignes.length,
        modeles_crees: resultat.modelesCrees,
        exemplaires_crees: resultat.exemplairesCrees,
        premier_code: resultat.codesGeneres[0] || null,
        dernier_code: resultat.codesGeneres[resultat.codesGeneres.length - 1] || null,
      }
    );

    return NextResponse.json({
      ok: true,
      resume: {
        totalLignesTraitees: lignes.length,
        totalModelesCrees: resultat.modelesCrees,
        totalModelesExistants: resultat.modelesExistants,
        totalExemplairesCrees: resultat.exemplairesCrees,
        premierCode: resultat.codesGeneres[0] || null,
        dernierCode: resultat.codesGeneres[resultat.codesGeneres.length - 1] || null,
      }
    }, { status: 201 });

  } catch (e: any) {
    console.error("POST /api/produits/import:", e);
    return erreur(500, e.message || "Erreur lors de l'importation massive des produits.");
  }
}
