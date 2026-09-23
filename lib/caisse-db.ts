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
  //
  // Le cast `::"CaisseDestination"` n'est pas décoratif : `caisse` est une
  // colonne de type ENUM, et Prisma lie `${caisseCible}` en paramètre non typé,
  // que Postgres résout en `text`. Or `enum = text` n'a pas d'opérateur — la
  // requête levait `42883` avant même de lire une ligne, donc TOUT mouvement de
  // caisse échouait (ventes, factures, commandes, lots, charges, répartition).
  // Le cast force la comparaison dans le type de la colonne, ce qui laisse
  // l'index `[caisse]` utilisable — un `caisse::text = $1` l'aurait perdu.
  const derniers = await tx.$queryRaw<{ solde_apres: number }[]>`
    SELECT solde_apres FROM mouvements_caisse
    WHERE caisse = ${caisseCible}::"CaisseDestination"
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
