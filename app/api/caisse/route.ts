import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { calculerSoldes } from "@/lib/caisse";
import { beneficeDuMois } from "@/lib/caisse-db";

const PAR_PAGE = 50;

function cleMoisUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const maintenant = new Date();
    const moisCourant = cleMoisUTC(maintenant);

    const caisseFilter = request.nextUrl.searchParams.get("caisse");
    const whereMouvementsPage: any = {};
    if (caisseFilter === "CAISSE_PHYSIQUE" || caisseFilter === "CAISSE_YALIDINE") {
      whereMouvementsPage.caisse = caisseFilter;
    }

    const [tous, totalFiltre, pageMouvements, parametres, repartitionFaite] = await Promise.all([
      prisma.mouvementCaisse.findMany({
        orderBy: { id: "asc" },
        select: { type: true, montant: true, date: true, solde_apres: true, caisse: true },
      }),
      prisma.mouvementCaisse.count({ where: whereMouvementsPage }),
      prisma.mouvementCaisse.findMany({
        where: whereMouvementsPage,
        orderBy: { id: "desc" },
        skip: (page - 1) * PAR_PAGE,
        take: PAR_PAGE,
        include: { user: { select: { username: true } } },
      }),
      prisma.parametres.findUnique({ where: { id: 1 } }),
      prisma.mouvementCaisse.findFirst({
        where: { type: "reinvest", description: { contains: `repartition:${moisCourant}` } },
        select: { id: true },
      }),
    ]);

    const mvtsPhysique = tous.filter((m) => m.caisse !== "CAISSE_YALIDINE");
    const mvtsYalidine = tous.filter((m) => m.caisse === "CAISSE_YALIDINE");

    const soldesPhysique = calculerSoldes(mvtsPhysique);
    const soldesYalidine = calculerSoldes(mvtsYalidine);
    const soldesGlobal = calculerSoldes(tous);

    const soldes = {
      total: soldesGlobal.total,
      reserve: soldesGlobal.reserve,
      disponible: soldesGlobal.disponible,
      physique: {
        total: soldesPhysique.total,
        reserve: soldesPhysique.reserve,
        disponible: soldesPhysique.disponible,
      },
      yalidine: {
        total: soldesYalidine.total,
        reserve: soldesYalidine.reserve,
        disponible: soldesYalidine.disponible,
      },
    };

        const JOUR_MS = 24 * 60 * 60 * 1000;
    
    const serieJours: { label: string; solde: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(maintenant.getTime() - i * JOUR_MS);
      const finJour = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
      const cle = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const avant = tous.filter((m) => m.date < finJour);
      serieJours.push({ label: cle, solde: calculerSoldes(avant).total });
    }

    const serieMois: { label: string; solde: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const debutSuivant = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i + 1, 1));
      const cle = cleMoisUTC(new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1)));
      const avant = tous.filter((m) => m.date < debutSuivant);
      serieMois.push({ label: cle, solde: calculerSoldes(avant).total });
    }

    const serieAns: { label: string; solde: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const annee = maintenant.getUTCFullYear() - i;
      const debutSuivant = new Date(Date.UTC(annee + 1, 0, 1));
      const cle = `${annee}`;
      const avant = tous.filter((m) => m.date < debutSuivant);
      serieAns.push({ label: cle, solde: calculerSoldes(avant).total });
    }

    const graphique_soldes = { jour: serieJours, mois: serieMois, an: serieAns };

    const benefice = await beneficeDuMois(
      prisma,
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth() + 1
    );

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
      graphique_soldes,
      repartition: {
        mois: moisCourant,
        deja_appliquee: repartitionFaite !== null,
        benefice_mois: benefice,
      },
      page,
      pages: Math.max(1, Math.ceil(totalFiltre / PAR_PAGE)),
      total: totalFiltre,
      mouvements: pageMouvements.map((m) => ({
        id: m.id,
        date: m.date.toISOString(),
        type: m.type,
        montant: m.montant,
        solde_apres: m.solde_apres,
        description: m.description,
        par: m.user.username,
        produit_id: m.produit_id,
        lot_id: m.lot_id,
        caisse: m.caisse,
      })),
    });
  } catch (e) {
    console.error("GET /api/caisse", e);
    return erreur(500, "Erreur lors du chargement de la caisse.");
  }
}
