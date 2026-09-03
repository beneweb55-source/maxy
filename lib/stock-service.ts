import { prisma } from "@/lib/db";
import type { Prisma, StatutProduit } from "@prisma/client";
import { creerProduitsGroupes } from "@/lib/creation-produits";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

type Tx = Prisma.TransactionClient;

/**
 * Définition métier du stock actif :
 * Les statuts qui comptent dans la quantité physique présente ou engagée en boutique.
 * Exclus du stock : 'vendu' (parti), 'hs' (mis au rebut), 'assemble' (intégré dans un PC assemblé BOM).
 */
export const STATUTS_EN_STOCK: readonly StatutProduit[] = [
  "recu",
  "en_test",
  "ok",
  "a_reparer",
  "manque_piece",
  "en_vente",
  "produit_commande",
] as const;

export const STATUTS_HORS_STOCK: readonly StatutProduit[] = [
  "vendu",
  "hs",
  "assemble",
] as const;

/**
 * Statuts autorisés pour une suppression automatique lors d'une réduction de stock.
 * Seuls les matériels non vendus, non réservés et sans engagement client sont éligibles.
 */
export const STATUTS_ELIGIBLES_DIMINUTION: readonly StatutProduit[] = [
  "en_vente",
  "recu",
  "ok",
] as const;

export interface OptionsCreationExemplaires {
  modeleId?: number | null;
  produitIdSource?: number | null;
  reference: string;
  categorie: string;
  categorie_id?: number | null;
  quantite: number;
  statut?: StatutProduit;
  prix_achat?: number;
  prix_vente_fixe?: number | null;
  emplacement?: string;
  grade?: string;
  en_vitrine?: boolean;
  lot_id?: number | null;
  numeros_serie?: string[];
  image_url?: string | null;
  images?: string[];
  est_compose?: boolean;
}

export interface ResultatMutationStock {
  ok: boolean;
  modeleId?: number | null;
  modeleNom?: string;
  ancienneQuantite: number;
  nouvelleQuantite: number;
  diff: number;
  codesCrees?: string[];
  message?: string;
}

/**
 * ==============================================================================
 * SERVICE MÉTIER UNIQUE : GESTION DES STOCKS & EXAMPLAIRES (DRY)
 * ==============================================================================
 */
export class StockService {
  /**
   * Crée N exemplaires en masse pour un modèle ou un produit.
   * Garantit l'incrémentation atomique de la quantité parente.
   */
  static async createExemplaires(
    userId: number,
    options: OptionsCreationExemplaires
  ): Promise<ResultatMutationStock> {
    if (
      typeof options.quantite !== "number" ||
      !Number.isInteger(options.quantite) ||
      options.quantite <= 0
    ) {
      throw new Error("La quantité d'exemplaires à créer doit être un nombre entier positif (1 à 500).");
    }
    const qty = Math.min(500, options.quantite);

    return await prisma.$transaction(
      async (tx) => {
        let parentModele: any = null;
        if (options.modeleId) {
          parentModele = await tx.modele.findUnique({
            where: { id: options.modeleId },
            include: { categorie: true },
          });
          if (!parentModele) {
            throw new Error(`Modèle #${options.modeleId} introuvable.`);
          }
        }

        const refName = parentModele?.nom || options.reference?.trim();
        const catName = parentModele?.categorie?.nom || options.categorie?.trim();
        const catId = parentModele?.categorie_id || options.categorie_id || null;

        if (!refName || !catName) {
          throw new Error("La référence et la catégorie sont obligatoires pour créer des exemplaires.");
        }

        const prixAchat = Number(options.prix_achat) || 0;
        const prixVente =
          options.prix_vente_fixe !== undefined && options.prix_vente_fixe !== null
            ? Number(options.prix_vente_fixe)
            : parentModele?.prix_vente_conseille ?? null;

        const statutCible = options.statut || (prixVente ? "en_vente" : "recu");
        const emplacementCible = options.en_vitrine ? "vitrine" : (options.emplacement || "reserve");
        const gradeCible = options.grade || "Grade A";
        const coverImg = parentModele?.image_url || options.image_url || null;
        const extraImgs = options.images && options.images.length > 0 ? options.images : (coverImg ? [coverImg] : []);

        // Préparation des lignes
        const lignes = Array.from({ length: qty }, (_, i) => ({
          reference: refName,
          categorie: catName,
          modele_id: parentModele?.id ?? options.modeleId ?? null,
          categorie_id: catId,
          numero_serie:
            Array.isArray(options.numeros_serie) && options.numeros_serie[i]
              ? options.numeros_serie[i]!.trim()
              : null,
          grade: gradeCible,
          emplacement: emplacementCible,
          prix_achat: prixAchat,
          prix_vente_fixe: prixVente,
          image_url: coverImg || undefined,
          images: extraImgs,
          est_compose: options.est_compose ?? false,
        }));

        // Insertion haute performance via creerProduitsGroupes
        const codes = await creerProduitsGroupes(tx, {
          lotId: options.lot_id ? Number(options.lot_id) : null,
          lignes,
          userId,
          statut: statutCible,
          enVitrine: options.en_vitrine === true || emplacementCible === "vitrine",
        });

        // Mise à jour de la quantité sur le modèle parent
        let nouvelleQte = qty;
        let ancienneQte = 0;

        if (parentModele) {
          ancienneQte = parentModele.quantite || 0;
          const majModele = await tx.modele.update({
            where: { id: parentModele.id },
            data: { quantite: { increment: qty } },
            select: { quantite: true },
          });
          nouvelleQte = majModele.quantite;
        }

        // Journalisation
        await enregistrerActivite(
          tx,
          userId,
          ACTIONS_JOURNAL.PRODUIT_AJOUTER,
          "lot",
          options.lot_id ? Number(options.lot_id) : undefined,
          {
            modele_id: parentModele?.id,
            reference: refName,
            quantite: qty,
            codes,
          }
        );

        return {
          ok: true,
          modeleId: parentModele?.id ?? null,
          modeleNom: refName,
          ancienneQuantite: ancienneQte,
          nouvelleQuantite: nouvelleQte,
          diff: qty,
          codesCrees: codes,
          message: `${qty} exemplaire(s) créé(s) avec succès pour ${refName}.`,
        };
      },
      { timeout: 60000 }
    );
  }

  /**
   * Définit directement la quantité globale en stock d'un modèle (ex: passer de 2 à 5 ou de 8 à 5).
   * Synchronisation magique bidirectionnelle :
   * - Si delta > 0 : crée delta exemplaires en arrière-plan avec les attributs du modèle.
   * - Si delta < 0 : retire |delta| exemplaires non vendus, non réservés et sans S/N prioritairement.
   */
  static async setStockQuantity(
    modeleId: number,
    cibleQuantite: number,
    userId: number,
    options?: { statutDefaut?: StatutProduit; emplacement?: string }
  ): Promise<ResultatMutationStock> {
    if (
      typeof cibleQuantite !== "number" ||
      !Number.isInteger(cibleQuantite) ||
      cibleQuantite < 0
    ) {
      throw new Error("La quantité de stock doit être un entier positif ou nul.");
    }
    const qteCible = Math.min(1000, cibleQuantite);

    return await prisma.$transaction(
      async (tx) => {
        // 1. Re-lecture du modèle avec verrou logique
        const modele = await tx.modele.findUnique({
          where: { id: modeleId },
          include: { categorie: true },
        });
        if (!modele) {
          throw new Error(`Modèle #${modeleId} introuvable.`);
        }

        // 2. Compter le nombre réel d'exemplaires actifs actuellement en stock
        const exemplairesActuels = await tx.produit.findMany({
          where: {
            modele_id: modeleId,
            statut: { notIn: Array.from(STATUTS_HORS_STOCK) },
          },
          include: {
            images: { select: { id: true, data: true } },
            _count: {
              select: {
                ventes: true,
                mouvements: true,
                reparations: true,
                lignes_commande: true,
              },
            },
          },
          orderBy: [
            { numero_serie: "desc" }, // les null en premier ou géré en mémoire
            { id: "desc" },
          ],
        });

        const quantiteActuelle = exemplairesActuels.length;
        const diff = qteCible - quantiteActuelle;

        if (diff === 0) {
          // Déjà à la bonne quantité, s'assurer que le champ modele.quantite est aligné
          if (modele.quantite !== qteCible) {
            await tx.modele.update({
              where: { id: modeleId },
              data: { quantite: qteCible },
            });
          }
          return {
            ok: true,
            modeleId: modele.id,
            modeleNom: modele.nom,
            ancienneQuantite: quantiteActuelle,
            nouvelleQuantite: qteCible,
            diff: 0,
            message: "Stock déjà à jour.",
          };
        }

        let codesCrees: string[] = [];

        // 3. CAS A : Augmentation directe (diff > 0) -> Génération automatique des exemplaires manquants
        if (diff > 0) {
          // Héritage des prix et données depuis le modèle ou le dernier exemplaire
          const dernierExemplaire = exemplairesActuels[0];
          const prixAchat = dernierExemplaire ? dernierExemplaire.prix_achat : 0;
          const prixVente =
            modele.prix_vente_conseille ??
            (dernierExemplaire ? dernierExemplaire.prix_vente_fixe : null);

          const statutCible = options?.statutDefaut || (prixVente ? "en_vente" : "recu");
          const emplacementCible = options?.emplacement || dernierExemplaire?.emplacement || "reserve";

          const coverImg = modele.image_url || dernierExemplaire?.image_url || null;
          const extraImgs = dernierExemplaire?.images?.map((i) => i.data) || (coverImg ? [coverImg] : []);

          const lignes = Array.from({ length: diff }, () => ({
            reference: modele.nom,
            categorie: modele.categorie.nom,
            modele_id: modele.id,
            categorie_id: modele.categorie_id,
            grade: dernierExemplaire?.grade || "Grade A",
            emplacement: emplacementCible,
            prix_achat: prixAchat,
            prix_vente_fixe: prixVente,
            image_url: coverImg || undefined,
            images: extraImgs,
          }));

          codesCrees = await creerProduitsGroupes(tx, {
            lotId: dernierExemplaire?.lot_id ?? null,
            lignes,
            userId,
            statut: statutCible,
            enVitrine: emplacementCible === "vitrine",
          });

          await tx.modele.update({
            where: { id: modeleId },
            data: { quantite: qteCible },
          });

          await enregistrerActivite(
            tx,
            userId,
            ACTIONS_JOURNAL.PRODUIT_MODIFIER,
            "modele",
            modele.id,
            {
              action: "ajustement_quantite_positive",
              ancienne: quantiteActuelle,
              nouvelle: qteCible,
              diff,
              codesCrees,
            }
          );
        }

        // 4. CAS B : Diminution directe (diff < 0) -> Retrait sécurisé des exemplaires non engagés
        if (diff < 0) {
          const aSupprimer = Math.abs(diff);

          // Filtrer les exemplaires éligibles à la suppression :
          // - Statut éligible (en_vente, recu, ok)
          // - Libres, sans numéro de série et sans engagement
          const exemplairesEligibles = exemplairesActuels.filter((p) => {
            const statutOk = STATUTS_ELIGIBLES_DIMINUTION.includes(p.statut);
            const sansLien =
              !p.numero_serie &&
              p._count.reparations === 0 &&
              p._count.lignes_commande === 0;
            return statutOk && sansLien;
          });

          // Trier par priorité : les plus récents en premier
          exemplairesEligibles.sort((a, b) => b.id - a.id);

          if (exemplairesEligibles.length < aSupprimer) {
            throw new Error(
              `Impossible de réduire la quantité à ${qteCible} : seuls ${exemplairesEligibles.length} exemplaire(s) sont libres et non assignés. Les autres exemplaires possèdent des numéros de série, des réparations ou des réservations en commande.`
            );
          }

          const ciblesASupprimer = exemplairesEligibles.slice(0, aSupprimer);
          const idsASupprimer = ciblesASupprimer.map((p) => p.id);

          // Nettoyage atomique des dépendances de ces exemplaires
          if (tx.mouvementCaisse?.updateMany) {
            await tx.mouvementCaisse.updateMany({ where: { produit_id: { in: idsASupprimer } }, data: { produit_id: null } });
          }
          if (tx.factureLigne?.updateMany) {
            await tx.factureLigne.updateMany({ where: { produit_id: { in: idsASupprimer } }, data: { produit_id: null } });
          }
          if (tx.ligneCommande?.updateMany) {
            await tx.ligneCommande.updateMany({ where: { produit_id: { in: idsASupprimer } }, data: { produit_id: null } });
          }
          if (tx.vente?.deleteMany) {
            await tx.vente.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
          }
          if (tx.reparation?.deleteMany) {
            await tx.reparation.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
          }
          if (tx.produitImage?.deleteMany) {
            await tx.produitImage.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
          }
          if (tx.historiqueStatut?.deleteMany) {
            await tx.historiqueStatut.deleteMany({ where: { produit_id: { in: idsASupprimer } } });
          }
          await tx.produit.deleteMany({ where: { id: { in: idsASupprimer } } });

          // Mise à jour de la quantité sur le modèle
          await tx.modele.update({
            where: { id: modeleId },
            data: { quantite: qteCible },
          });

          await enregistrerActivite(
            tx,
            userId,
            ACTIONS_JOURNAL.PRODUIT_MODIFIER,
            "modele",
            modele.id,
            {
              action: "ajustement_quantite_negative",
              ancienne: quantiteActuelle,
              nouvelle: qteCible,
              diff,
              idsSupprimes: idsASupprimer,
            }
          );
        }

        return {
          ok: true,
          modeleId: modele.id,
          modeleNom: modele.nom,
          ancienneQuantite: quantiteActuelle,
          nouvelleQuantite: qteCible,
          diff,
          codesCrees,
          message:
            diff > 0
              ? `Stock augmenté à ${qteCible} (${diff} nouveau(x) exemplaire(s) créé(s)).`
              : `Stock réduit à ${qteCible} (${Math.abs(diff)} exemplaire(s) retiré(s)).`,
        };
      },
      { timeout: 60000 }
    );
  }

  /**
   * Incrémente ou décrémente le stock d'un delta donné (+1, -1, +5, etc.)
   */
  static async adjustStock(
    modeleId: number,
    delta: number,
    userId: number
  ): Promise<ResultatMutationStock> {
    const modele = await prisma.modele.findUnique({
      where: { id: modeleId },
      select: { quantite: true },
    });
    if (!modele) throw new Error(`Modèle #${modeleId} introuvable.`);
    const nouvelle = Math.max(0, (modele.quantite || 0) + delta);
    return await this.setStockQuantity(modeleId, nouvelle, userId);
  }

  /**
   * Re-synchronise le champ quantite d'un modèle pour garantir l'invariant strict.
   */
  static async synchroniserCompteModele(modeleId: number, tx?: Tx): Promise<number> {
    const client = tx || prisma;
    const count = await client.produit.count({
      where: {
        modele_id: modeleId,
        statut: { notIn: Array.from(STATUTS_HORS_STOCK) },
      },
    });

    await client.modele.update({
      where: { id: modeleId },
      data: { quantite: count },
    });

    return count;
  }
}
