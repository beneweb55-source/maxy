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

/**
 * Numéro de facture séquentiel par année : « FA-2026-0001 ».
 * Calculé dans la transaction de vente pour rester cohérent.
 */
async function prochainNumero(tx: Tx, quand: Date): Promise<string> {
  const annee = quand.getFullYear();
  const prefixe = `FA-${annee}-`;
  // Rang maximal calculé NUMÉRIQUEMENT (et non par tri de chaîne, qui placerait
  // « FA-2026-9999 » après « FA-2026-10000 » au-delà de 9 999 factures).
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
 * Crée la facture correspondant à une vente (simple ou groupée). Toute vente
 * génère automatiquement sa facture, avec la garantie appliquée à chaque ligne.
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
    groupeVente?: string | null;
  }
): Promise<{ id: number; numero: string }> {
  const { lignes, userId, quand, canal, clientNom, clientTel, groupeVente } = options;
  const garantieFin = finGarantie(quand);
  const total = lignes.reduce((s, l) => s + l.prix, 0);

  const facture = await tx.facture.create({
    data: {
      numero: await prochainNumero(tx, quand),
      date_emission: quand,
      client_nom: clientNom?.trim() || null,
      client_tel: clientTel?.trim() || null,
      total,
      garantie_mois: GARANTIE_MOIS,
      garantie_fin: garantieFin,
      canal: canal?.trim() || null,
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
