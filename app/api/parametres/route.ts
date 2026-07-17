import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  try {
    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
    return NextResponse.json({
      marge_minimum_pct: parametres?.marge_minimum_pct ?? 20,
      objectif_reserve: parametres?.objectif_reserve ?? 50000,
      pct_reinvest: parametres?.pct_reinvest ?? 50,
      pct_reserve: parametres?.pct_reserve ?? 20,
      pct_parts: parametres?.pct_parts ?? 20,
      pct_frais: parametres?.pct_frais ?? 10,
    });
  } catch (e) {
    console.error("GET /api/parametres", e);
    return erreur(500, "Erreur lors du chargement des paramètres.");
  }
}

export async function PUT(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { marge_minimum_pct, objectif_reserve, pct_reinvest, pct_reserve, pct_parts, pct_frais } = (corps ?? {}) as {
    pct_reinvest?: unknown;
    pct_reserve?: unknown;
    pct_parts?: unknown;
    pct_frais?: unknown;
    marge_minimum_pct?: unknown;
    objectif_reserve?: unknown;
  };
  if (
    typeof marge_minimum_pct !== "number" ||
    !Number.isInteger(marge_minimum_pct) ||
    marge_minimum_pct < 0 ||
    marge_minimum_pct > 100
  ) {
    return erreur(400, "La marge minimum doit être un entier entre 0 et 100 (%).");
  }
  if (
    typeof pct_reinvest === "number" &&
    typeof pct_reserve === "number" &&
    typeof pct_parts === "number" &&
    typeof pct_frais === "number" &&
    pct_reinvest + pct_reserve + pct_parts + pct_frais !== 100
  ) {
    return erreur(400, "La somme des pourcentages de répartition doit être égale à 100%.");
  }

  if (
    typeof objectif_reserve !== "number" ||
    !Number.isInteger(objectif_reserve) ||
    objectif_reserve < 0
  ) {
    return erreur(400, "L'objectif de réserve doit être un entier positif en DA.");
  }

  try {
    const parametres = await prisma.parametres.upsert({
      where: { id: 1 },
      create: { id: 1, marge_minimum_pct, objectif_reserve, pct_reinvest: pct_reinvest as number, pct_reserve: pct_reserve as number, pct_parts: pct_parts as number, pct_frais: pct_frais as number },
      update: { marge_minimum_pct, objectif_reserve, pct_reinvest: pct_reinvest as number, pct_reserve: pct_reserve as number, pct_parts: pct_parts as number, pct_frais: pct_frais as number },
    });
    return NextResponse.json({
      ok: true,
      marge_minimum_pct: parametres.marge_minimum_pct,
      objectif_reserve: parametres.objectif_reserve,
      pct_reinvest: parametres.pct_reinvest,
      pct_reserve: parametres.pct_reserve,
      pct_parts: parametres.pct_parts,
      pct_frais: parametres.pct_frais,
    });
  } catch (e) {
    console.error("PUT /api/parametres", e);
    return erreur(500, "Erreur lors de l'enregistrement des paramètres.");
  }
}
