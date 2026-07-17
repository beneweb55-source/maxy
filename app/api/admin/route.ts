import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { soldesCaisse } from "@/lib/caisse-db";

export async function GET() {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  try {
    const [
      soldes,
      parametres,
      nbLots,
      nbProduits,
      nbVentes,
      nbVentesAnnulees,
      nbMouvements,
      nbReparations,
      nbNotifications,
      utilisateurs,
      dernierMouvement,
    ] = await Promise.all([
      soldesCaisse(prisma),
      prisma.parametres.findUnique({ where: { id: 1 } }),
      prisma.lot.count(),
      prisma.produit.count(),
      prisma.vente.count({ where: { annulee: false } }),
      prisma.vente.count({ where: { annulee: true } }),
      prisma.mouvementCaisse.count(),
      prisma.reparation.count(),
      prisma.notification.count(),
      prisma.user.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          username: true,
          role: true,
          login_attempts: true,
          locked_until: true,
        },
      }),
      prisma.mouvementCaisse.findFirst({
        orderBy: { id: "desc" },
        select: { date: true, solde_apres: true },
      }),
    ]);

    const maintenant = Date.now();
    return NextResponse.json({
      soldes,
      parametres: {
        marge_minimum_pct: parametres?.marge_minimum_pct ?? 20,
        objectif_reserve: parametres?.objectif_reserve ?? 50000,
        pct_reinvest: parametres?.pct_reinvest ?? 50,
        pct_reserve: parametres?.pct_reserve ?? 20,
        pct_parts: parametres?.pct_parts ?? 20,
        pct_frais: parametres?.pct_frais ?? 10,
      },
      compteurs: {
        lots: nbLots,
        produits: nbProduits,
        ventes: nbVentes,
        ventes_annulees: nbVentesAnnulees,
        mouvements: nbMouvements,
        reparations: nbReparations,
        notifications: nbNotifications,
      },
      dernier_mouvement: dernierMouvement
        ? { date: dernierMouvement.date.toISOString(), solde_apres: dernierMouvement.solde_apres }
        : null,
      utilisateurs: utilisateurs.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        login_attempts: u.login_attempts,
        verrouille: u.locked_until !== null && u.locked_until.getTime() > maintenant,
        locked_until: u.locked_until ? u.locked_until.toISOString() : null,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin", e);
    return erreur(500, "Erreur lors du chargement du panel d'administration.");
  }
}
