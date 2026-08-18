import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";

export async function GET() {
  const user = await utilisateurCourant();
  if (!user || user.role !== "admin") {
    // Dans le cas où un simple vendeur pourrait utiliser la caisse, ajuster ici
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ventes = await prisma.vente.findMany({
    where: {
      date_vente: {
        gte: today,
      },
      annulee: false,
    },
    select: {
      prix_vente_reel: true,
    }
  });

  const total = ventes.reduce((sum, v) => sum + v.prix_vente_reel, 0);
  const nombre = ventes.length;

  return NextResponse.json({ total, nombre });
}
