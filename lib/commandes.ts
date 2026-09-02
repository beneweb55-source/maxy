import { prisma } from "@/lib/db";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import { creerFacture } from "@/lib/factures";
import { ajouterMouvement } from "@/lib/caisse-db";
import type { 
  StatutCommande, 
  TypePaiement, 
  StatutProduit, 
  CanalVente, 
  CaisseDestination 
} from "@prisma/client";

export interface LigneCommandeInput {
  produit_id?: number | null;
  modele_id?: number | null;
  code_interne?: string;
  designation?: string;
  numero_serie?: string | null;
  categorie?: string | null;
  quantite?: number;
  prix_unitaire: number;
  remise_ligne?: number;
  mode_ajout?: "scan" | "manuel";
  etiquette_imprimee?: boolean;
}

export interface CreateOrderInput {
  client_id?: number | null;
  client_nom?: string | null;
  client_tel?: string | null;
  client_adresse?: string | null;
  client_rc?: string | null;
  client_nif?: string | null;
  client_ai?: string | null;
  client_nis?: string | null;
  canal?: CanalVente;
  statut?: StatutCommande; // EN_ATTENTE, CONFIRMEE, EN_LIVRAISON, TERMINEE, ANNULEE
  caisse?: CaisseDestination; // CAISSE_PHYSIQUE ou CAISSE_YALIDINE
  wilaya?: string | null;
  commune?: string | null;
  frais_livraison?: number;
  payee?: boolean;
  type_facture?: string | null;
  type_paiement?: TypePaiement;
  remise_globale?: number;
  garantie_mois?: number;
  notes?: string | null;
  lignes: LigneCommandeInput[];
}

/**
 * Moteur Métier OMS pour la création, réservation de stock et encaissement omnicanal :
 * 
 * - CANAUX : COMPTOIR, YALIDINE, OUEDKNISS, TELEPHONE, FACEBOOK
 * - PHASE RÉSERVATION (EN_ATTENTE / CONFIRMEE / EN_LIVRAISON) :
 *     Les exemplaires physiques passent immédiatement en statut "produit_commande" (réservé).
 *     Ils sont exclus du stock vendable au comptoir pour empêcher les doubles ventes.
 * - PHASE CLÔTURE & FINANCE (TERMINEE) :
 *     Les produits passent définitivement en statut "vendu".
 *     Si canal COMPTOIR -> argent injecté dans CAISSE_PHYSIQUE.
 *     Si canal YALIDINE -> argent injecté dans CAISSE_YALIDINE.
 * - PHASE ANNULATION (ANNULEE) :
 *     Les exemplaires réservés repassent au statut disponible "en_vente".
 */
export async function createOrder(data: CreateOrderInput, userId: number) {
  if (!Array.isArray(data.lignes) || data.lignes.length === 0) {
    throw new Error("Le panier ne contient aucun article.");
  }

  // Détermination du canal et de la caisse
  const canal: CanalVente = data.canal || "COMPTOIR";
  const caisse: CaisseDestination = 
    data.caisse || (canal === "YALIDINE" ? "CAISSE_YALIDINE" : "CAISSE_PHYSIQUE");
  const statut: StatutCommande = data.statut || (canal === "COMPTOIR" && data.payee ? "TERMINEE" : "EN_ATTENTE");
  const type_paiement: TypePaiement = data.type_paiement || "especes";
  const fraisLivraison = Math.max(0, Number(data.frais_livraison) || 0);
  const garantie_mois = Number(data.garantie_mois ?? 6);
  const estPayee = Boolean(data.payee ?? (statut === "TERMINEE"));

  // Calculs financiers & normalisation des lignes
  let totalHT = 0;
  const lignesTraitees = data.lignes.map((l) => {
    const pu = Number(l.prix_unitaire) || 0;
    const qte = Math.max(1, Number(l.quantite) || 1);
    const remiseLigne = Number(l.remise_ligne) || 0;
    const totalLigne = Math.max(0, pu * qte - remiseLigne);
    totalHT += totalLigne;

    const mode_ajout = l.mode_ajout === "manuel" ? "manuel" : "scan";
    const etiquette_imprimee = Boolean(l.etiquette_imprimee ?? (mode_ajout === "scan"));

    return {
      produit_id: l.produit_id ? Number(l.produit_id) : null,
      modele_id: l.modele_id ? Number(l.modele_id) : null,
      code_interne: l.code_interne || "P-0000",
      designation: l.designation || "Article",
      numero_serie: l.numero_serie || null,
      categorie: l.categorie || null,
      quantite: qte,
      prix_unitaire: pu,
      remise_ligne: remiseLigne,
      total_ligne: totalLigne,
      mode_ajout,
      etiquette_imprimee,
    };
  });

  const totalFinalTTC = Math.max(0, totalHT + fraisLivraison - Number(data.remise_globale || 0));

  // Date de fin de garantie
  const garantieFin = new Date();
  garantieFin.setMonth(garantieFin.getMonth() + garantie_mois);

  // Transaction atomique
  const commandeCreee = await prisma.$transaction(async (tx) => {
    // 1. Numéro séquentiel annuel : CMD-YYYY-XXXX
    const anneeCourante = new Date().getFullYear();
    const prefixe = `CMD-${anneeCourante}-`;

    const derniereCmd = await tx.commande.findFirst({
      where: { numero: { startsWith: prefixe } },
      orderBy: { id: "desc" },
      select: { numero: true },
    });

    let compteur = 1;
    if (derniereCmd) {
      const numPart = Number(derniereCmd.numero.split("-")[2]);
      if (!isNaN(numPart)) compteur = numPart + 1;
    }

    const numeroCommande = `${prefixe}${String(compteur).padStart(4, "0")}`;

    // 2. Création de la commande
    const cmd = await tx.commande.create({
      data: {
        numero: numeroCommande,
        canal,
        statut,
        caisse,
        type_paiement,
        payee: estPayee,
        client_id: data.client_id ? Number(data.client_id) : null,
        client_nom: data.client_nom || (data.client_id ? null : "Client Particulier"),
        client_tel: data.client_tel || null,
        client_adresse: data.client_adresse || null,
        wilaya: data.wilaya || null,
        commune: data.commune || null,
        frais_livraison: fraisLivraison,
        total_ht: totalHT,
        total_tva: 0,
        total_ttc: totalFinalTTC,
        remise_globale: Number(data.remise_globale || 0),
        garantie_mois,
        garantie_fin: garantieFin,
        notes: data.notes || null,
        cree_par: userId,
        lignes: {
          create: lignesTraitees,
        },
      },
      include: {
        client: true,
        lignes: true,
        vendeur: { select: { id: true, username: true } },
      },
    });

    // 3. Moteur d'États & Réservation des exemplaires physiques
    for (const l of lignesTraitees) {
      if (l.produit_id) {
        const prodExistant = await tx.produit.findUnique({
          where: { id: l.produit_id },
          select: { id: true, statut: true, code_interne: true },
        });
        const statutActuel = prodExistant?.statut || "en_vente";

        let statutCible: StatutProduit = "produit_commande";
        let noteHistorique = "";

        if (statut === "TERMINEE") {
          statutCible = "vendu";
          noteHistorique = `Vente effectuée sur la commande ${numeroCommande} (${canal})`;
        } else {
          // Réservation immédiate pour EN_ATTENTE, CONFIRMEE, EN_LIVRAISON
          statutCible = "produit_commande";
          noteHistorique = `Stock réservé pour commande ${numeroCommande} (${canal} - ${statut})`;
        }

        const updateData: {
          statut: StatutProduit;
          prix_vente_reel: number;
          date_vente?: Date;
          etiquette_imprimee?: boolean;
          etiquette_imprimee_le?: Date;
        } = {
          statut: statutCible,
          prix_vente_reel: l.prix_unitaire,
        };

        if (statutCible === "vendu") {
          updateData.date_vente = new Date();
        }

        if (l.etiquette_imprimee) {
          updateData.etiquette_imprimee = true;
          updateData.etiquette_imprimee_le = new Date();
        }

        await tx.produit.update({
          where: { id: l.produit_id },
          data: updateData,
        });

        await tx.historiqueStatut.create({
          data: {
            produit_id: l.produit_id,
            user_id: userId,
            statut_avant: statutActuel,
            statut_apres: statutCible,
            note: noteHistorique,
          },
        });
      }
    }

    // 4. Flux Financier si TERMINEE
    if (statut === "TERMINEE" && totalFinalTTC > 0) {
      await ajouterMouvement(tx, {
        montant: totalFinalTTC,
        type: "vente",
        user_id: userId,
        description: `Encaissement commande ${numeroCommande} (${canal})`,
        caisse,
      });
    }

    // 5. Facturation conjointe
    let factureInfo: { id: number; numero: string } | null = null;
    const lignesFacture = lignesTraitees
      .filter((l) => l.produit_id !== null)
      .map((l) => ({
        produit_id: l.produit_id!,
        code_interne: l.code_interne,
        designation: l.designation,
        categorie: l.categorie,
        prix: l.prix_unitaire,
      }));

    if (lignesFacture.length > 0 && (statut === "TERMINEE" || estPayee || data.type_facture)) {
      factureInfo = await creerFacture(tx, {
        lignes: lignesFacture,
        userId,
        quand: new Date(),
        clientNom: data.client_nom || (data.client_id ? null : "Client Particulier"),
        clientTel: data.client_tel,
        clientAdresse: data.client_adresse || (data.wilaya ? `${data.commune ? data.commune + ", " : ""}${data.wilaya}` : null),
        clientRc: data.client_rc,
        clientNif: data.client_nif,
        clientAi: data.client_ai,
        clientNis: data.client_nis,
        typeFacture: data.type_facture || (statut === "EN_ATTENTE" ? "proforma" : "normale"),
        modePaiement: type_paiement,
        commandeId: cmd.id,
        canal: canal,
        canalVente: canal,
        caisseDestination: caisse,
        typeVente: (caisse === "CAISSE_YALIDINE" || canal === "YALIDINE") ? "YALIDINE" : "COMPTOIR",
        saleType: (caisse === "CAISSE_YALIDINE" || canal === "YALIDINE") ? "YALIDINE" : "COMPTOIR",
      });
    }

    return {
      ...cmd,
      facture_id: factureInfo?.id ?? null,
      facture_numero: factureInfo?.numero ?? null,
    };
  });

  // 6. Journal d'audit
  await enregistrerActivite(
    prisma,
    userId,
    ACTIONS_JOURNAL.VENTE_ENREGISTRER,
    "commande",
    commandeCreee.id,
    {
      numero: commandeCreee.numero,
      canal: commandeCreee.canal,
      total_ttc: commandeCreee.total_ttc,
      nb_lignes: lignesTraitees.length,
      statut: commandeCreee.statut,
      caisse: commandeCreee.caisse,
    }
  );

  return commandeCreee;
}

/**
 * Transition d'état contrôlée d'une commande (Moteur OMS) :
 * 
 * - Si passage à TERMINEE :
 *     - Produits -> 'vendu'
 *     - Encaissement automatique dans cmd.caisse (CAISSE_PHYSIQUE ou CAISSE_YALIDINE)
 * - Si passage à ANNULEE :
 *     - Libération immédiate des exemplaires réservés -> 'en_vente'
 * - Si passage à CONFIRMEE ou EN_LIVRAISON :
 *     - Produits maintenus en 'produit_commande' (réservés)
 */
export async function changerStatutCommande(
  commandeId: number,
  nouveauStatut: StatutCommande,
  userId: number,
  options?: { note?: string }
) {
  return await prisma.$transaction(async (tx) => {
    const cmd = await tx.commande.findUnique({
      where: { id: commandeId },
      include: {
        lignes: true,
        factures: true,
      },
    });

    if (!cmd) throw new Error("Commande introuvable.");
    const ancienStatut = cmd.statut;
    if (ancienStatut === nouveauStatut) return cmd;

    // 1. Traitement selon le nouveau statut
    if (nouveauStatut === "ANNULEE") {
      // ANNULATION : Libérer les produits réservés
      for (const l of cmd.lignes) {
        if (l.produit_id) {
          const prod = await tx.produit.findUnique({
            where: { id: l.produit_id },
            select: { id: true, statut: true },
          });

          if (prod && (prod.statut === "produit_commande" || prod.statut === "vendu")) {
            await tx.produit.update({
              where: { id: l.produit_id },
              data: {
                statut: "en_vente",
                date_vente: null,
              },
            });

            await tx.historiqueStatut.create({
              data: {
                produit_id: l.produit_id,
                user_id: userId,
                statut_avant: prod.statut,
                statut_apres: "en_vente",
                note: `Stock libéré suite à annulation de la commande ${cmd.numero}${options?.note ? ` : ${options.note}` : ""}`,
              },
            });
          }
        }
      }

      // Annuler les factures associées
      for (const f of cmd.factures) {
        await tx.facture.update({
          where: { id: f.id },
          data: { annulee: true },
        });
      }
    } else if (nouveauStatut === "TERMINEE") {
      // CLÔTURE & ENCAISSEMENT
      for (const l of cmd.lignes) {
        if (l.produit_id) {
          const prod = await tx.produit.findUnique({
            where: { id: l.produit_id },
            select: { id: true, statut: true },
          });

          await tx.produit.update({
            where: { id: l.produit_id },
            data: {
              statut: "vendu",
              date_vente: new Date(),
              prix_vente_reel: l.prix_unitaire,
            },
          });

          if (prod && prod.statut !== "vendu") {
            await tx.historiqueStatut.create({
              data: {
                produit_id: l.produit_id,
                user_id: userId,
                statut_avant: prod.statut,
                statut_apres: "vendu",
                note: `Vente finalisée / Livraison confirmée pour commande ${cmd.numero} (${cmd.canal})`,
              },
            });
          }
        }
      }

      // Encaissement étanche dans la caisse de destination (si non encore payée)
      if (!cmd.payee && cmd.total_ttc > 0) {
        await ajouterMouvement(tx, {
          montant: cmd.total_ttc,
          type: "vente",
          user_id: userId,
          description: `Encaissement commande ${cmd.numero} (${cmd.canal})`,
          caisse: cmd.caisse,
        });
      }
    } else if (nouveauStatut === "EN_LIVRAISON" || nouveauStatut === "CONFIRMEE") {
      // Réservation stricte en stock
      for (const l of cmd.lignes) {
        if (l.produit_id) {
          const prod = await tx.produit.findUnique({
            where: { id: l.produit_id },
            select: { id: true, statut: true },
          });

          if (prod && prod.statut === "en_vente") {
            await tx.produit.update({
              where: { id: l.produit_id },
              data: { statut: "produit_commande" },
            });

            await tx.historiqueStatut.create({
              data: {
                produit_id: l.produit_id,
                user_id: userId,
                statut_avant: "en_vente",
                statut_apres: "produit_commande",
                note: `Article réservé pour commande ${cmd.numero} (${nouveauStatut})`,
              },
            });
          }
        }
      }
    }

    // 2. Mise à jour de la commande
    const cmdMaj = await tx.commande.update({
      where: { id: commandeId },
      data: {
        statut: nouveauStatut,
        payee: nouveauStatut === "TERMINEE" ? true : cmd.payee,
      },
      include: {
        client: true,
        lignes: true,
        vendeur: { select: { id: true, username: true } },
      },
    });

    return cmdMaj;
  });
}
