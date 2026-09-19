import type { Prisma, PrismaClient, TypeMouvement, CaisseDestination } from "@prisma/client";
import { calculerSoldes, soldeApres, type SoldesCaisse } from "./caisse";

type Db = Prisma.TransactionClient | PrismaClient;

export interface NouveauMouvement {
  montant: number;
  type: TypeMouvement;
  user_id: number;
  produit_id?: number;
  lot_id?: number;
  description?: string;
  date?: Date;
  caisse?: CaisseDestination;
}

export async function ajouterMouvement(tx: Prisma.TransactionClient, m: NouveauMouvement) {
  const caisseCible = m.caisse ?? "CAISSE_PHYSIQUE";
  // SELECT FOR UPDATE to prevent race conditions on concurrent balance reads
  const derniers = await tx.$queryRaw<{ solde_apres: number }[]>`
    SELECT solde_apres FROM mouvements_caisse
    WHERE caisse = ${caisseCible}
    ORDER BY id DESC LIMIT 1
    FOR UPDATE
  `;
  const premier = derniers[0];
  const soldePrecedent = premier ? Number(premier.solde_apres) : 0;
  return tx.mouvementCaisse.create({
    data: {
      ...m,
      caisse: caisseCible,
      solde_apres: soldeApres(soldePrecedent, m.type, m.montant),
    },
  });
}

export async function soldesCaisse(db: Db): Promise<SoldesCaisse> {
  const mouvements = await db.mouvementCaisse.findMany({
    orderBy: { id: "asc" },
    select: { type: true, montant: true },
  });
  return calculerSoldes(mouvements);
}

export async function beneficeDuMois(db: Db, annee: number, mois1a12: number): Promise<number> {
  const debut = new Date(Date.UTC(annee, mois1a12 - 1, 1));
  const fin = new Date(Date.UTC(annee, mois1a12, 1));
  const ventes = await db.vente.findMany({
    where: { annulee: false, date_vente: { gte: debut, lt: fin } },
    include: {
      produit: { select: { prix_achat: true, reparations: { select: { cout: true } } } },
    },
  });
  return ventes.reduce(
    (somme, v) =>
      somme +
      v.prix_vente_reel -
      v.produit.prix_achat -
      v.produit.reparations.reduce((s, r) => s + r.cout, 0),
    0
  );
}
