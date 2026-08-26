import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const familles = await prisma.familleInfo.findMany();
    return NextResponse.json(familles);
  } catch (error) {
    console.error("Erreur GET /api/familles:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
