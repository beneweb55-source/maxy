import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

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
      entreprise_nom: parametres?.entreprise_nom ?? "Solution Maxi",
      entreprise_adresse: parametres?.entreprise_adresse ?? "Alger, Algérie",
      entreprise_tel: parametres?.entreprise_tel ?? "0000 00 00 00",
      entreprise_rc: parametres?.entreprise_rc ?? "RC XXXXXXXXX",
      entreprise_nif: parametres?.entreprise_nif ?? "NIF XXXXXXXXX",
      entreprise_nis: parametres?.entreprise_nis ?? "NIS XXXXXXXXX",
      entreprise_art: parametres?.entreprise_art ?? "ART XXXXXXXXX",
      entreprise_rib: parametres?.entreprise_rib ?? null,
      entreprise_cachet: parametres?.entreprise_cachet ?? null,
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
  const {
    marge_minimum_pct,
    objectif_reserve,
    pct_reinvest,
    pct_reserve,
    pct_parts,
    pct_frais,
    entreprise_nom,
    entreprise_adresse,
    entreprise_tel,
    entreprise_rc,
    entreprise_nif,
    entreprise_nis,
    entreprise_art,
    entreprise_rib,
    entreprise_cachet,
  } = (corps ?? {}) as {
    pct_reinvest?: unknown;
    pct_reserve?: unknown;
    pct_parts?: unknown;
    pct_frais?: unknown;
    marge_minimum_pct?: unknown;
    objectif_reserve?: unknown;
    entreprise_nom?: unknown;
    entreprise_adresse?: unknown;
    entreprise_tel?: unknown;
    entreprise_rc?: unknown;
    entreprise_nif?: unknown;
    entreprise_nis?: unknown;
    entreprise_art?: unknown;
    entreprise_rib?: unknown;
    entreprise_cachet?: unknown;
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
      create: {
        id: 1,
        marge_minimum_pct,
        objectif_reserve,
        pct_reinvest: pct_reinvest as number,
        pct_reserve: pct_reserve as number,
        pct_parts: pct_parts as number,
        pct_frais: pct_frais as number,
        entreprise_nom: typeof entreprise_nom === "string" ? entreprise_nom : "Solution Maxi",
        entreprise_adresse: typeof entreprise_adresse === "string" ? entreprise_adresse : "Alger, Algérie",
        entreprise_tel: typeof entreprise_tel === "string" ? entreprise_tel : "0000 00 00 00",
        entreprise_rc: typeof entreprise_rc === "string" ? entreprise_rc : "RC XXXXXXXXX",
        entreprise_nif: typeof entreprise_nif === "string" ? entreprise_nif : "NIF XXXXXXXXX",
        entreprise_nis: typeof entreprise_nis === "string" ? entreprise_nis : "NIS XXXXXXXXX",
        entreprise_art: typeof entreprise_art === "string" ? entreprise_art : "ART XXXXXXXXX",
        entreprise_rib: typeof entreprise_rib === "string" ? entreprise_rib : undefined,
        entreprise_cachet: typeof entreprise_cachet === "string" ? entreprise_cachet : undefined,
      },
      update: {
        marge_minimum_pct,
        objectif_reserve,
        pct_reinvest: pct_reinvest as number,
        pct_reserve: pct_reserve as number,
        pct_parts: pct_parts as number,
        pct_frais: pct_frais as number,
        entreprise_nom: typeof entreprise_nom === "string" ? entreprise_nom : undefined,
        entreprise_adresse: typeof entreprise_adresse === "string" ? entreprise_adresse : undefined,
        entreprise_tel: typeof entreprise_tel === "string" ? entreprise_tel : undefined,
        entreprise_rc: typeof entreprise_rc === "string" ? entreprise_rc : undefined,
        entreprise_nif: typeof entreprise_nif === "string" ? entreprise_nif : undefined,
        entreprise_nis: typeof entreprise_nis === "string" ? entreprise_nis : undefined,
        entreprise_art: typeof entreprise_art === "string" ? entreprise_art : undefined,
        entreprise_rib: typeof entreprise_rib === "string" ? entreprise_rib : undefined,
        entreprise_cachet: typeof entreprise_cachet === "string" ? entreprise_cachet : undefined,
      },
    });

    await enregistrerActivite(prisma, acces.user.id, ACTIONS_JOURNAL.PARAMETRES_MODIFIER, "parametres", undefined, {
      marge_minimum_pct: parametres.marge_minimum_pct,
      objectif_reserve: parametres.objectif_reserve,
      pct_reinvest: parametres.pct_reinvest,
      pct_reserve: parametres.pct_reserve,
      pct_parts: parametres.pct_parts,
      pct_frais: parametres.pct_frais
    });

    return NextResponse.json({
      ok: true,
      marge_minimum_pct: parametres.marge_minimum_pct,
      objectif_reserve: parametres.objectif_reserve,
      pct_reinvest: parametres.pct_reinvest,
      pct_reserve: parametres.pct_reserve,
      pct_parts: parametres.pct_parts,
      pct_frais: parametres.pct_frais,
      entreprise_nom: parametres.entreprise_nom,
      entreprise_adresse: parametres.entreprise_adresse,
      entreprise_tel: parametres.entreprise_tel,
      entreprise_rc: parametres.entreprise_rc,
      entreprise_nif: parametres.entreprise_nif,
      entreprise_nis: parametres.entreprise_nis,
      entreprise_art: parametres.entreprise_art,
      entreprise_rib: parametres.entreprise_rib,
      entreprise_cachet: parametres.entreprise_cachet,
    });
  } catch (e) {
    console.error("PUT /api/parametres", e);
    return erreur(500, "Erreur lors de la mise à jour des paramètres.");
  }
}
