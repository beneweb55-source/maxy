import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";

export async function GET() {
  const user = await utilisateurCourant();
  if (!user || (user.role !== "gerant" && user.role !== "dev")) {
    // Dans le cas où un simple vendeur pourrait utiliser la caisse, ajuster ici
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const params = await prisma.parametres.findFirst({ select: { caisse_vide_a: true } });

  let startTime = new Date();
  startTime.setHours(0, 0, 0, 0);
  
  if (params?.caisse_vide_a && params.caisse_vide_a > startTime) {
    startTime = params.caisse_vide_a;
  }

  const ventes = await prisma.vente.findMany({
    where: {
      date_vente: {
        gte: startTime,
      },
      annulee: false,
    },
    select: {
      prix_vente_reel: true,
      type_vente: true,
    }
  });

  const totalComptoir = ventes
    .filter((v) => v.type_vente !== "YALIDINE")
    .reduce((sum, v) => sum + v.prix_vente_reel, 0);
  const totalYalidine = ventes
    .filter((v) => v.type_vente === "YALIDINE")
    .reduce((sum, v) => sum + v.prix_vente_reel, 0);
  const totalGlobal = totalComptoir + totalYalidine;
  const nombre = ventes.length;

  return NextResponse.json({
    total: totalGlobal,
    nombre,
    total_comptoir: totalComptoir,
    total_yalidine: totalYalidine,
    total_global: totalGlobal,
    nombre_comptoir: ventes.filter((v) => v.type_vente !== "YALIDINE").length,
    nombre_yalidine: ventes.filter((v) => v.type_vente === "YALIDINE").length,
  });
}
