import { prisma } from "@/lib/db";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";
import { creerFacture } from "@/lib/factures";
import type { StatutCommande, TypePaiement, StatutProduit } from "@prisma/client";

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
  type_facture?: string | null;
  statut?: StatutCommande; // "payee" | "en_attente" | "devis" | "annulee" | "remboursee"
  type_paiement?: TypePaiement; // "especes" | "carte" | "virement" | "cheque"
  remise_globale?: number;
  garantie_mois?: number;
  notes?: string | null;
  lignes: LigneCommandeInput[];
}

/**
 * Logique Métier ERP / WMS pour la création et le déstockage des commandes :
 * - RÈGLE 1 (Scan douchette) : L'article scanné possède déjà son étiquette -> Statut "vendu" immédiat en caisse.
 * - RÈGLE 2 (Ajout manuel) : Vérification d'étiquetage. Si validé -> "vendu" + etiquette_imprimee = true.
 *                            Si commande en attente/devis -> Statut "produit_commande" (réservé en stock).
 */
export async function createOrder(data: CreateOrderInput, userId: number) {
  if (!Array.isArray(data.lignes) || data.lignes.length === 0) {
    throw new Error("Le panier ne contient aucun article.");
  }

  const statut = data.statut || "payee";
  const type_paiement = data.type_paiement || "especes";
  const garantie_mois = Number(data.garantie_mois ?? 6);

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

  const totalFinalTTC = Math.max(0, totalHT - Number(data.remise_globale || 0));

  // Date de fin de garantie
  const garantieFin = new Date();
  garantieFin.setMonth(garantieFin.getMonth() + garantie_mois);

  // Transaction atomique
  const commandeCreee = await prisma.$transaction(async (tx) => {
    // 1. Génération du numéro séquentiel CMD-YYYY-XXXX
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
        statut,
        type_paiement,
        client_id: data.client_id ? Number(data.client_id) : null,
        client_nom: data.client_nom || (data.client_id ? null : "Client Particulier"),
        client_tel: data.client_tel || null,
        client_adresse: data.client_adresse || null,
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

    // 3. Déstockage et transition de statut des équipements physiques
    if (statut === "payee" || statut === "en_attente") {
      for (const l of lignesTraitees) {
        if (l.produit_id) {
          let statutCible: StatutProduit = "vendu";
          let noteHistorique = "";

          if (statut === "en_attente") {
            // RÈGLE 2.b : Commande en attente (réservée par téléphone ou devis) -> "produit_commande"
            statutCible = "produit_commande";
            noteHistorique = `Produit réservé (Commande en attente ${numeroCommande})`;
          } else {
            // Statut "payee"
            if (l.mode_ajout === "scan") {
              // RÈGLE 1 : Scan douchette avec étiquette pré-imprimée -> "vendu"
              statutCible = "vendu";
              noteHistorique = `Vente effectuée par scan étiquette sur la commande ${numeroCommande}`;
            } else {
              // RÈGLE 2 : Ajout manuel
              if (l.etiquette_imprimee) {
                statutCible = "vendu";
                noteHistorique = `Vente effectuée avec validation étiquette sur la commande ${numeroCommande}`;
              } else {
                statutCible = "produit_commande";
                noteHistorique = `Produit commandé manuellement (en attente étiquette) sur la commande ${numeroCommande}`;
              }
            }
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
              statut_avant: "en_vente",
              statut_apres: statutCible,
              note: noteHistorique,
            },
          });
        }
      }
    }

    // 4. Création conjointe de la facture si payée ou si préparée
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

    if (lignesFacture.length > 0 && (statut === "payee" || data.type_facture)) {
      factureInfo = await creerFacture(tx, {
        lignes: lignesFacture,
        userId,
        quand: new Date(),
        clientNom: data.client_nom || (data.client_id ? null : "Client Particulier"),
        clientTel: data.client_tel,
        clientAdresse: data.client_adresse,
        clientRc: data.client_rc,
        clientNif: data.client_nif,
        clientAi: data.client_ai,
        clientNis: data.client_nis,
        typeFacture: data.type_facture || (statut === "devis" ? "proforma" : "normale"),
        modePaiement: type_paiement,
      });
    }

    return {
      ...cmd,
      facture_id: factureInfo?.id ?? null,
      facture_numero: factureInfo?.numero ?? null,
    };
  });

  // 5. Journal d'audit
  await enregistrerActivite(
    prisma,
    userId,
    ACTIONS_JOURNAL.VENTE_ENREGISTRER,
    "commande",
    commandeCreee.id,
    {
      numero: commandeCreee.numero,
      total_ttc: commandeCreee.total_ttc,
      nb_lignes: lignesTraitees.length,
      statut: commandeCreee.statut,
    }
  );

  return commandeCreee;
}
