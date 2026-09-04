import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

/**
 * Route de synchronisation des champs texte legacy avec les FK classification.
 * DÉSACTIVÉ — Cette route ne fait rien tant qu'elle n'est pas réactivée délibérément.
 * La synchronisation `categorie` ↔ `categorie_id` doit être gérée par les routes
 * de classification, pas par un batch séparé.
 */
export async function POST() {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  return NextResponse.json({
    success: true,
    message: "Route désactivée. La synchronisation est gérée par les routes de classification.",
    mis_a_jour: 0
  });
}
