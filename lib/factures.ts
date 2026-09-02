import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Durée de garantie offerte sur chaque produit vendu (en mois). */
export const GARANTIE_MOIS = 6;

/**
 * Date de fin de garantie : date de vente + GARANTIE_MOIS mois.
 * Le jour est ramené au dernier jour du mois cible s'il n'existe pas
 * (31 août + 6 mois → 28/29 février, et non le 2 ou 3 mars).
 */
export function finGarantie(depuis: Date, mois = GARANTIE_MOIS): Date {
  const fin = new Date(depuis);
  const jour = fin.getDate();
  fin.setDate(1);
  fin.setMonth(fin.getMonth() + mois);
  const dernierJourDuMois = new Date(fin.getFullYear(), fin.getMonth() + 1, 0).getDate();
  fin.setDate(Math.min(jour, dernierJourDuMois));
  return fin;
}

/** Préfixes des numéros de document selon le type */
const PREFIXES_DOCUMENT: Record<TypeDocumentLegal, string> = {
  FACTURE_TVA: "FA",
  PROFORMA: "PF",
  DEVIS: "DV",
};

/**
 * Type légal d'un document commercial.
 * Correspond à l'enum TypeDocument dans le schéma Prisma.
 */
export type TypeDocumentLegal = "FACTURE_TVA" | "PROFORMA" | "DEVIS";

/**
 * Numéro de document séquentiel par type et par année.
 * Exemples : « FA-2026-0001 », « DV-2026-0042 », « PF-2026-0007 »
 * Calculé dans la transaction pour rester cohérent (protection race condition).
 *
 * Si `numeroManuel` est fourni et non-vide, il est utilisé directement
 * après vérification d'unicité dans la base.
 */
async function prochainNumero(
  tx: Tx,
  quand: Date,
  typeDoc: TypeDocumentLegal = "FACTURE_TVA",
  numeroManuel?: string | null
): Promise<string> {
  // Numéro manuel : priorité si fourni et non-vide
  if (numeroManuel && numeroManuel.trim()) {
    const numero = numeroManuel.trim();
    // Vérifier l'unicité
    const existing = await tx.facture.findUnique({ where: { numero }, select: { id: true } });
    if (existing) {
      throw new Error(`Le numéro de document « ${numero} » est déjà utilisé par une autre facture.`);
    }
    return numero;
  }

  const annee = quand.getFullYear();
  const prefixe = `${PREFIXES_DOCUMENT[typeDoc]}-${annee}-`;

  // Rang maximal calculé NUMÉRIQUEMENT (et non par tri de chaîne)
  const lignes = await tx.$queryRaw<{ rang: number | null }[]>`
    SELECT MAX(CAST(split_part(numero, '-', 3) AS INTEGER)) AS rang
    FROM factures
    WHERE numero LIKE ${`${prefixe}%`}
  `;
  const rang = Number(lignes[0]?.rang ?? 0);
  return `${prefixe}${String(rang + 1).padStart(4, "0")}`;
}

export interface LigneFacture {
  produit_id: number;
  vente_id?: number;
  code_interne: string;
  designation: string;
  categorie?: string | null;
  prix: number;
}

/**
 * Crée la facture correspondant à une vente (simple ou groupée).
 * Supporte désormais :
 * - Les types de documents légaux (FACTURE_TVA, PROFORMA, DEVIS)
 * - La numérotation personnalisable (numeroManuel)
 */
export async function creerFacture(
  tx: Tx,
  options: {
    lignes: LigneFacture[];
    userId: number;
    quand: Date;
    canal?: string | null;
    clientNom?: string | null;
    clientTel?: string | null;
    clientAdresse?: string | null;
    clientRc?: string | null;
    clientNif?: string | null;
    clientAi?: string | null;
    clientNis?: string | null;
    /** @deprecated Utilisez typeDocument à la place */
    typeFacture?: string | null;
    /** Type légal du document : FACTURE_TVA (défaut), PROFORMA, ou DEVIS */
    typeDocument?: TypeDocumentLegal | null;
    modePaiement?: string | null;
    groupeVente?: string | null;
    /** Numéro personnalisé — remplace la génération automatique si fourni */
    numeroManuel?: string | null;
  }
): Promise<{ id: number; numero: string }> {
  const {
    lignes, userId, quand, canal,
    clientNom, clientTel, clientAdresse, clientRc, clientNif, clientAi, clientNis,
    typeDocument, typeFacture, modePaiement, groupeVente, numeroManuel,
  } = options;

  // Résolution du type de document légal
  // typeDocument a la priorité sur le legacy typeFacture
  let typeDocumentFinal: TypeDocumentLegal = "FACTURE_TVA";
  if (typeDocument && ["FACTURE_TVA", "PROFORMA", "DEVIS"].includes(typeDocument)) {
    typeDocumentFinal = typeDocument;
  } else if (typeFacture) {
    // Mapping legacy pour rétrocompatibilité
    const tf = typeFacture.toLowerCase().trim();
    if (tf === "proforma") typeDocumentFinal = "PROFORMA";
    else if (tf === "devis") typeDocumentFinal = "DEVIS";
    else typeDocumentFinal = "FACTURE_TVA";
  }

  const garantieFin = finGarantie(quand);
  const total = lignes.reduce((s, l) => s + l.prix, 0);

  const numero = await prochainNumero(tx, quand, typeDocumentFinal, numeroManuel);

  const facture = await tx.facture.create({
    data: {
      numero,
      date_emission: quand,
      client_nom: clientNom?.trim() || null,
      client_tel: clientTel?.trim() || null,
      client_adresse: clientAdresse?.trim() || null,
      client_rc: clientRc?.trim() || null,
      client_nif: clientNif?.trim() || null,
      client_ai: clientAi?.trim() || null,
      client_nis: clientNis?.trim() || null,
      type_document: typeDocumentFinal,
      total,
      garantie_mois: GARANTIE_MOIS,
      garantie_fin: garantieFin,
      canal: canal?.trim() || null,
      mode_paiement: modePaiement?.trim() || "especes",
      groupe_vente: groupeVente ?? null,
      cree_par: userId,
    },
    select: { id: true, numero: true },
  });

  await tx.factureLigne.createMany({
    data: lignes.map((l) => ({
      facture_id: facture.id,
      produit_id: l.produit_id,
      vente_id: l.vente_id ?? null,
      code_interne: l.code_interne,
      designation: l.designation,
      categorie: l.categorie ?? null,
      prix: l.prix,
      garantie_fin: garantieFin,
    })),
  });

  return facture;
}
