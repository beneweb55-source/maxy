import { NextResponse } from "next/server";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { configPourRole } from "@/lib/dashboard/config";
import { chargerDonneesDashboard } from "@/lib/dashboard/donnees";
import type { ReponseDashboard } from "@/lib/dashboard/types";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const config = configPourRole(acces.user.role);
    const donnees = await chargerDonneesDashboard(acces.user, config);
    const reponse: ReponseDashboard = { config, donnees };
    return NextResponse.json(reponse);
  } catch (e) {
    console.error("GET /api/dashboard", e);
    return erreur(500, "Erreur lors du chargement du tableau de bord.");
  }
}
